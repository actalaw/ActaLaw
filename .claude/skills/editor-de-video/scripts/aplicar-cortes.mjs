#!/usr/bin/env node
// Aplica cortes.json: gera editado.mp4 (30 fps constante) e remapeia a transcrição para a nova timeline.
//   node aplicar-cortes.mjs <projeto> [--fps 30]
// Saída: editado.mp4, transcricao-editada.json, transcricao-editada.txt, meta-editado.json
import fs from 'node:fs';
import path from 'node:path';
import {argumentos, executar, fmt, gravarJson, lerJson, projeto, sondar} from './lib.mjs';

const args = argumentos();
const {dir, arq, slug} = projeto(args._[0]);
const meta = lerJson(arq('meta.json'));
const fps = Number(args.fps ?? 30);
const original = path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith('original.')));
const cortes = fs.existsSync(arq('cortes.json')) ? lerJson(arq('cortes.json')) : {removidos: []};
const duracao = meta.duracao;

// Une os trechos removidos e calcula os mantidos.
const rem = [...cortes.removidos].map((r) => [Math.max(0, r.de), Math.min(duracao, r.ate)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
const unidos = [];
for (const [a, b] of rem) {
  const u = unidos[unidos.length - 1];
  if (u && a <= u[1] + 0.05) u[1] = Math.max(u[1], b);
  else unidos.push([a, b]);
}
const mantidos = [];
let cursor = 0;
for (const [a, b] of unidos) {
  if (a - cursor >= 0.1) mantidos.push([cursor, a]);
  cursor = b;
}
if (duracao - cursor >= 0.1) mantidos.push([cursor, duracao]);
if (!mantidos.length) mantidos.push([0, duracao]);

// Filtro do ffmpeg: corta cada trecho, micro-fade de 8 ms no áudio para não estalar, concatena.
const linhas = [];
const rotulos = [];
mantidos.forEach(([a, b], k) => {
  linhas.push(`[0:v]trim=start=${a.toFixed(4)}:end=${b.toFixed(4)},setpts=PTS-STARTPTS[v${k}]`);
  if (meta.temAudio) {
    const d = b - a;
    linhas.push(
      `[0:a]atrim=start=${a.toFixed(4)}:end=${b.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=${Math.max(0, d - 0.008).toFixed(4)}:d=0.008[a${k}]`,
    );
  }
  rotulos.push(meta.temAudio ? `[v${k}][a${k}]` : `[v${k}]`);
});
linhas.push(`${rotulos.join('')}concat=n=${mantidos.length}:v=1:a=${meta.temAudio ? 1 : 0}${meta.temAudio ? '[vc][ac]' : '[vc]'}`);
linhas.push(`[vc]fps=${fps},format=yuv420p[vout]`);
const script = arq('.filtro-cortes.txt');
fs.writeFileSync(script, linhas.join(';\n'));

console.log(`• Renderizando editado.mp4 (${mantidos.length} trecho(s))…`);
executar('ffmpeg', [
  '-y', '-v', 'error', '-i', original,
  '-filter_complex_script', script,
  '-map', '[vout]', ...(meta.temAudio ? ['-map', '[ac]', '-c:a', 'aac', '-b:a', '192k'] : []),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-movflags', '+faststart',
  arq('editado.mp4'),
]);
fs.unlinkSync(script);

// Remapeia palavras para a timeline editada.
const mapa = [];
let off = 0;
for (const [a, b] of mantidos) {
  mapa.push({de: +a.toFixed(3), ate: +b.toFixed(3), novoInicio: +off.toFixed(3)});
  off += b - a;
}
const remap = (t) => {
  const m = mapa.find((s) => t >= s.de - 1e-6 && t <= s.ate + 1e-6);
  return m ? m.novoInicio + (t - m.de) : null;
};
const transcricao = fs.existsSync(arq('transcricao.json')) ? lerJson(arq('transcricao.json')) : {palavras: []};
const palavras = [];
for (const w of transcricao.palavras) {
  const meio = remap((w.i + w.f) / 2);
  if (meio === null) continue;
  const seg = mapa.find((s) => (w.i + w.f) / 2 >= s.de && (w.i + w.f) / 2 <= s.ate);
  const i = seg.novoInicio + Math.max(0, w.i - seg.de);
  const f = seg.novoInicio + Math.min(seg.ate, w.f) - seg.de;
  palavras.push({t: w.t, i: +i.toFixed(3), f: +Math.max(i + 0.05, f).toFixed(3)});
}

const metaEditado = {...sondar(arq('editado.mp4')), fps};
gravarJson(arq('meta-editado.json'), {...metaEditado, mapa});
gravarJson(arq('transcricao-editada.json'), {fonte: transcricao.fonte, duracao: metaEditado.duracao, palavras});

// Versão legível (frases com tempo) — é o que o Claude lê para montar o plano.
const frases = [];
let atual = [];
palavras.forEach((w, k) => {
  atual.push(w);
  const prox = palavras[k + 1];
  if (!prox || /[.!?…]$/.test(w.t) || prox.i - w.f > 0.7 || atual.length >= 14) {
    frases.push(`[${fmt(atual[0].i)}] ${atual.map((x) => x.t).join(' ')}`);
    atual = [];
  }
});
fs.writeFileSync(arq('transcricao-editada.txt'), frases.join('\n') + '\n');

console.log(`✓ editado.mp4: ${fmt(duracao)} → ${fmt(metaEditado.duracao)} · ${palavras.length} palavras remapeadas
  ${arq('transcricao-editada.txt')}
Próximo: node scripts/frames.mjs ${slug}`);
