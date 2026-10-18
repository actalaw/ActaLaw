#!/usr/bin/env node
// Transcrição palavra a palavra.
//   node transcrever.mjs <projeto> [--idioma pt] [--glossario "ActaLaw, STF, habeas corpus"]
//   node transcrever.mjs <projeto> --srt legenda.srt     (alternativa offline: SRT/VTT de outro app)
//
// Padrão: Groq Whisper (whisper-large-v3) com timestamps por palavra. Requer GROQ_API_KEY e
// acesso de rede a api.groq.com. Saída: transcricao.json + transcricao.txt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {argumentos, executar, falhar, fmt, gravarJson, lerJson, normalizar, projeto} from './lib.mjs';

const args = argumentos();
const {dir, arq} = projeto(args._[0]);
const meta = lerJson(arq('meta.json'));
const idioma = args.idioma ?? 'pt';
const MODELO = process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3';
const BASE = process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1'; // qualquer endpoint compatível com a API da OpenAI
const LIMITE_BYTES = 24_000_000;
const PEDACO_S = 1200;

// ---------- SRT / VTT ----------
const lerLegenda = (arquivo) => {
  const txt = fs.readFileSync(arquivo, 'utf8').replace(/\r/g, '');
  const tempo = (s) => {
    const [h, m, rest] = s.trim().replace(',', '.').split(':').length === 3 ? s.trim().replace(',', '.').split(':') : ['0', ...s.trim().replace(',', '.').split(':')];
    return Number(h) * 3600 + Number(m) * 60 + Number(rest);
  };
  const segmentos = [];
  for (const bloco of txt.split(/\n\n+/)) {
    const linhas = bloco.split('\n').filter(Boolean);
    const k = linhas.findIndex((l) => l.includes('-->'));
    if (k < 0) continue;
    const [a, b] = linhas[k].split('-->').map((x) => tempo(x.split(' ').filter(Boolean)[0] ?? x));
    const texto = linhas.slice(k + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (texto) segmentos.push({t: texto, i: a, f: b});
  }
  // Sem tempo por palavra: distribui proporcionalmente ao tamanho de cada palavra.
  const palavras = [];
  for (const s of segmentos) {
    const ws = s.t.split(/\s+/);
    const total = ws.reduce((n, w) => n + w.length + 1, 0);
    let c = s.i;
    for (const w of ws) {
      const d = ((s.f - s.i) * (w.length + 1)) / total;
      palavras.push({t: w, i: +c.toFixed(3), f: +(c + d * 0.92).toFixed(3)});
      c += d;
    }
  }
  return {segmentos, palavras, fonte: `legenda:${path.basename(arquivo)} (tempos por palavra estimados)`};
};

// ---------- Groq ----------
const chamarGroq = async (arquivoAudio) => {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(arquivoAudio)], {type: 'audio/mpeg'}), path.basename(arquivoAudio));
  form.append('model', MODELO);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  form.append('language', idioma);
  form.append('temperature', '0');
  if (args.glossario) form.append('prompt', String(args.glossario));

  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    let res;
    try {
      res = await fetch(`${BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${process.env.GROQ_API_KEY}`},
        body: form,
      });
    } catch (e) {
      falhar(
        `Não consegui conectar em api.groq.com (${e.cause?.code ?? e.message}).\n` +
          '  Na nuvem: libere o domínio api.groq.com em Network access do ambiente (menu do ambiente → Edit).',
      );
    }
    if (res.ok) return res.json();
    const corpo = (await res.text()).slice(0, 400);
    if (res.status === 401) falhar('GROQ_API_KEY inválida (401).');
    if (res.status === 403) falhar(`Acesso negado (403): ${corpo}\n  Se for o proxy do ambiente, libere api.groq.com em Network access.`);
    if ((res.status === 429 || res.status >= 500) && tentativa < 4) {
      const espera = Number(res.headers.get('retry-after')) || 2 ** tentativa * 2;
      console.warn(`⚠ Groq ${res.status}; nova tentativa em ${espera} s`);
      await new Promise((r) => setTimeout(r, espera * 1000));
      continue;
    }
    falhar(`Groq respondeu ${res.status}: ${corpo}`);
  }
};

// Recoloca a pontuação dos segmentos nas palavras (o Whisper devolve palavras sem pontuação).
const pontuar = (palavras, segmentos) => {
  let k = 0;
  for (const s of segmentos) {
    const tokens = s.t.trim().split(/\s+/);
    let j = 0;
    while (k < palavras.length && palavras[k].i < s.f - 0.01 && j < tokens.length) {
      const nw = normalizar(palavras[k].t);
      const achou = [0, 1, 2].find((d) => tokens[j + d] && normalizar(tokens[j + d]) === nw);
      if (achou !== undefined) {
        palavras[k].t = tokens[j + achou];
        j += achou + 1;
      }
      k++;
    }
  }
  return palavras;
};

const transcreverGroq = async () => {
  if (!process.env.GROQ_API_KEY)
    falhar(
      'GROQ_API_KEY não definida.\n' +
        '  Na nuvem: adicione GROQ_API_KEY nas variáveis do ambiente (menu do ambiente → Edit) e abra uma nova sessão.\n' +
        '  Alternativa offline: exporte a legenda .srt de outro app e rode com --srt arquivo.srt',
    );
  const audio = arq('audio.mp3');
  if (!fs.existsSync(audio)) falhar('Falta audio.mp3 (o vídeo tem áudio? rode ingerir.mjs)');

  const pedacos = [];
  if (fs.statSync(audio).size <= LIMITE_BYTES) pedacos.push({arquivo: audio, offset: 0});
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'groq-'));
    for (let a = 0, n = 0; a < meta.duracao; a += PEDACO_S, n++) {
      const f = path.join(tmp, `p${n}.mp3`);
      executar('ffmpeg', ['-y', '-v', 'error', '-ss', String(a), '-t', String(PEDACO_S), '-i', audio, '-ac', '1', '-ar', '16000', '-b:a', '48k', f]);
      pedacos.push({arquivo: f, offset: a});
    }
  }

  const palavras = [];
  const segmentos = [];
  for (const [n, p] of pedacos.entries()) {
    if (pedacos.length > 1) console.log(`• parte ${n + 1}/${pedacos.length}`);
    const r = await chamarGroq(p.arquivo);
    for (const w of r.words ?? []) palavras.push({t: w.word.trim(), i: +(w.start + p.offset).toFixed(3), f: +(w.end + p.offset).toFixed(3)});
    for (const s of r.segments ?? []) segmentos.push({t: s.text.trim(), i: +(s.start + p.offset).toFixed(3), f: +(s.end + p.offset).toFixed(3)});
  }
  if (!palavras.length) falhar('A Groq não devolveu palavras (o áudio tem fala?)');
  return {palavras: pontuar(palavras, segmentos), segmentos, fonte: `groq/${MODELO}`};
};

const r = args.srt ? lerLegenda(args.srt) : await transcreverGroq();
const texto = r.segmentos.map((s) => s.t).join(' ');
gravarJson(arq('transcricao.json'), {fonte: r.fonte, idioma, duracao: meta.duracao, texto, palavras: r.palavras, segmentos: r.segmentos});
fs.writeFileSync(arq('transcricao.txt'), r.segmentos.map((s) => `[${fmt(s.i)}] ${s.t}`).join('\n') + '\n');

console.log(`✓ ${r.palavras.length} palavras, ${r.segmentos.length} segmentos (${r.fonte})
  ${path.join(dir, 'transcricao.txt')}
Próximo: node scripts/cortes.mjs ${path.basename(dir)}`);
