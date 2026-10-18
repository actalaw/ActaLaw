#!/usr/bin/env node
// Propõe cortes automáticos: silêncios longos, hesitações ("é…", "hum") e início/fim mortos.
// Também SUGERE retakes (frases repetidas) para o Claude decidir — esses não entram sozinhos.
//
//   node cortes.mjs <projeto> [--pausa 0.45] [--respiro 0.14] [--ruido auto|-35]
//                             [--remover "12.3-15.8,20-21"] [--sem-cortes] [--manter-hesitacoes]
//
// Saída: cortes.json (lista "removidos" — editável à mão antes de aplicar-cortes.mjs).
import fs from 'node:fs';
import {argumentos, executar, fmt, gravarJson, lerJson, normalizar, projeto} from './lib.mjs';

const args = argumentos();
const {arq, slug} = projeto(args._[0]);
const meta = lerJson(arq('meta.json'));
const palavras = fs.existsSync(arq('transcricao.json')) ? lerJson(arq('transcricao.json')).palavras : [];
const PAUSA = Number(args.pausa ?? 0.45);
const RESPIRO = Number(args.respiro ?? 0.14);
const duracao = meta.duracao;

// Só sons de hesitação inequívocos: vogal arrastada ("ééé", "ããã"), "eh"/"ah"/"uh", "hum", "hmm", "ahn".
// Nunca palavras reais de uma letra como "e", "é", "a", "o".
const HESITACAO = /^(?:([aãeéêoóõu])\1+h*|h?[aeéu]h+|hu+m+|hm+|ahn+|uhm+|mm+|hã+|ãh+)$/;
const soLetras = (t) => t.toLowerCase().replace(/[^\p{L}]/gu, '');

const removidos = [];
const sugestoesRetake = [];

if (!args['sem-cortes'] && meta.temAudio) {
  // Limiar de silêncio adaptado ao volume médio da gravação.
  let ruido = Number(args.ruido);
  if (!args.ruido || args.ruido === 'auto') {
    const vd = executar('ffmpeg', ['-v', 'info', '-i', arq('audio.mp3'), '-af', 'volumedetect', '-f', 'null', '-']).stderr;
    const media = Number(vd.match(/mean_volume: (-?[\d.]+) dB/)?.[1] ?? -28);
    ruido = Math.max(-50, Math.min(-28, media - 12));
  }
  const sd = executar('ffmpeg', ['-v', 'info', '-i', arq('audio.mp3'), '-af', `silencedetect=noise=${ruido}dB:d=${PAUSA}`, '-f', 'null', '-']).stderr;
  const inicios = [...sd.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, Number(m[1])));
  const fins = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const silencios = inicios.map((a, k) => [a, fins[k] ?? duracao]);

  const temFalaDentro = (a, b) => palavras.some((w) => (w.i + w.f) / 2 > a && (w.i + w.f) / 2 < b);
  for (const [a, b] of silencios) {
    const ehInicio = a <= 0.05;
    const ehFim = b >= duracao - 0.05;
    const de = ehInicio ? 0 : a + RESPIRO;
    const ate = ehFim ? duracao : b - RESPIRO;
    if (ate - de < 0.2) continue;
    if (temFalaDentro(de, ate)) continue; // fala baixa detectada como silêncio: não corta
    removidos.push({de: +de.toFixed(3), ate: +ate.toFixed(3), motivo: ehInicio ? 'início' : ehFim ? 'fim' : 'silêncio'});
  }

  // Início/fim mortos segundo a transcrição (mesmo que haja ruído de fundo).
  if (palavras.length) {
    const primeira = palavras[0].i - 0.15;
    const ultima = palavras[palavras.length - 1].f + 0.45;
    if (primeira > 0.3) removidos.push({de: 0, ate: +primeira.toFixed(3), motivo: 'início'});
    if (duracao - ultima > 0.3) removidos.push({de: +ultima.toFixed(3), ate: duracao, motivo: 'fim'});
  }

  if (!args['manter-hesitacoes']) {
    for (const w of palavras) {
      if (HESITACAO.test(soLetras(w.t)) && w.f - w.i < 1.5) {
        removidos.push({de: +(w.i - 0.03).toFixed(3), ate: +(w.f + 0.03).toFixed(3), motivo: 'hesitação', texto: w.t});
      }
    }
  }

  // Retakes: sequência de 3+ palavras repetida logo em seguida (até 12 palavras / 6 s depois)
  // → o primeiro take provavelmente é descartável.
  const norm = palavras.map((w) => normalizar(w.t));
  for (let k = 0; k < norm.length - 3; k++) {
    for (let j = k + 3; j < norm.length - 2 && j - k <= 12 && palavras[j].i - palavras[k].i < 6; j++) {
      let n = 0;
      while (j + n < norm.length && k + n < j && norm[k + n] && norm[k + n] === norm[j + n]) n++;
      if (n >= 3 && !sugestoesRetake.some((s) => Math.abs(s.de - palavras[k].i) < 0.5)) {
        sugestoesRetake.push({
          de: +(palavras[k].i - 0.05).toFixed(3),
          ate: +(palavras[j].i - 0.08).toFixed(3),
          texto: palavras.slice(k, j).map((w) => w.t).join(' '),
          repeticao: palavras.slice(j, j + n).map((w) => w.t).join(' '),
        });
      }
    }
  }
}

for (const faixa of String(args.remover ?? '').split(',').filter(Boolean)) {
  const [de, ate] = faixa.split('-').map(Number);
  if (ate > de) removidos.push({de, ate, motivo: 'manual'});
}

removidos.sort((a, b) => a.de - b.de);
const total = (lista) => {
  // soma considerando sobreposição
  let s = 0;
  let fim = -1;
  for (const r of lista) {
    const de = Math.max(r.de, fim);
    if (r.ate > de) s += r.ate - de;
    fim = Math.max(fim, r.ate);
  }
  return s;
};
const removido = total(removidos);
gravarJson(arq('cortes.json'), {
  parametros: {pausa: PAUSA, respiro: RESPIRO},
  duracaoOriginal: duracao,
  duracaoFinal: +(duracao - removido).toFixed(3),
  removidos,
  sugestoesRetake,
});

const porMotivo = removidos.reduce((m, r) => ((m[r.motivo] = (m[r.motivo] ?? 0) + 1), m), {});
console.log(`✓ Cortes propostos: ${removidos.length} (${Object.entries(porMotivo).map(([k, v]) => `${v} ${k}`).join(', ') || 'nenhum'})
  ${fmt(duracao)} → ${fmt(duracao - removido)} (−${removido.toFixed(1)} s)`);
if (sugestoesRetake.length) {
  console.log(`\n⚠ ${sugestoesRetake.length} possível(is) retake(s) — decida e, se for o caso, adicione em "removidos" (motivo "retake"):`);
  for (const s of sugestoesRetake) console.log(`  ${fmt(s.de)}–${fmt(s.ate)}  "${s.texto}"  ⟶ repete: "${s.repeticao}…"`);
}
console.log(`\nPróximo: revisar cortes.json e rodar node scripts/aplicar-cortes.mjs ${slug}`);
