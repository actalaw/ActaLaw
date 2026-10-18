#!/usr/bin/env node
// Sintetiza os efeitos sonoros (e uma trilha ambiente provisória) do zero, em JS puro.
// São sons próprios, sem licença de terceiros. Uso: node gerar-sfx.mjs [--forcar]
import fs from 'node:fs';
import path from 'node:path';
import {argumentos, ESTUDIO, executar} from './lib.mjs';

const SR = 44100;
const args = argumentos();
const DIR_SFX = path.join(ESTUDIO, 'public', 'sfx');
const DIR_MUSICA = path.join(ESTUDIO, 'public', 'musica');
fs.mkdirSync(DIR_SFX, {recursive: true});
fs.mkdirSync(DIR_MUSICA, {recursive: true});

// Gerador pseudoaleatório determinístico: o mesmo arquivo sai sempre igual.
let semente = 1234567;
const rand = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

const gravarWav = (arquivo, amostras) => {
  let pico = 0;
  for (const x of amostras) pico = Math.max(pico, Math.abs(x));
  const ganho = pico > 0 ? 0.89 / pico : 1; // normaliza em -1 dBFS
  const buf = Buffer.alloc(44 + amostras.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + amostras.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(amostras.length * 2, 40);
  amostras.forEach((x, k) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x * ganho)) * 32767), 44 + k * 2));
  fs.writeFileSync(arquivo, buf);
};

const n = (seg) => Math.round(seg * SR);
const env = (k, total, ataque, decaimento = 4) => {
  const t = k / total;
  return t < ataque ? t / ataque : Math.exp(-decaimento * (t - ataque));
};

// Ruído filtrado por passa-baixa de um polo com corte variável no tempo.
const ruidoFiltrado = (dur, corte, envelope) => {
  const N = n(dur);
  const out = new Float32Array(N);
  let y = 0;
  for (let k = 0; k < N; k++) {
    const fc = corte(k / N);
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (rand() - y);
    out[k] = y * envelope(k, N);
  }
  return out;
};

const SONS = {
  // Passagem de ar: ruído com corte subindo e descendo.
  whoosh: () =>
    ruidoFiltrado(0.55, (t) => 300 + 5200 * Math.sin(Math.PI * Math.min(1, t * 1.2)), (k, N) => Math.sin(Math.PI * (k / N)) ** 2),
  // Bolha curta: seno com queda de afinação.
  pop: () => {
    const N = n(0.14);
    const out = new Float32Array(N);
    let fase = 0;
    for (let k = 0; k < N; k++) {
      const t = k / SR;
      fase += (2 * Math.PI * (900 * Math.exp(-t * 28) + 260)) / SR;
      out[k] = Math.sin(fase) * env(k, N, 0.02, 7);
    }
    return out;
  },
  // Impacto grave.
  thud: () => {
    const N = n(0.45);
    const out = new Float32Array(N);
    let fase = 0;
    const clique = ruidoFiltrado(0.02, () => 2500, (k, M) => 1 - k / M);
    for (let k = 0; k < N; k++) {
      const t = k / SR;
      fase += (2 * Math.PI * (38 + 70 * Math.exp(-t * 18))) / SR;
      out[k] = Math.sin(fase) * env(k, N, 0.01, 6) + (clique[k] ?? 0) * 0.5;
    }
    return out;
  },
  // Clique de interface.
  click: () => ruidoFiltrado(0.035, () => 6000, (k, N) => Math.exp((-8 * k) / N)),
  // Subida de tensão (antes de um número/revelação).
  riser: () => {
    const N = n(0.9);
    const ruido = ruidoFiltrado(0.9, (t) => 400 + 7000 * t * t, (k, M) => (k / M) ** 2);
    const out = new Float32Array(N);
    let fase = 0;
    for (let k = 0; k < N; k++) {
      const t = k / N;
      fase += (2 * Math.PI * (180 + 700 * t * t)) / SR;
      out[k] = ruido[k] * 0.8 + Math.sin(fase) * 0.25 * t * t;
    }
    return out;
  },
  // Sino suave (acerto, encerramento).
  ding: () => {
    const N = n(1.2);
    const out = new Float32Array(N);
    const parciais = [
      [1318.5, 1],
      [2637, 0.35],
      [3955, 0.15],
      [1975.5, 0.25],
    ];
    for (let k = 0; k < N; k++) {
      const t = k / SR;
      out[k] = parciais.reduce((s, [f, a]) => s + a * Math.sin(2 * Math.PI * f * t), 0) * env(k, N, 0.005, 5);
    }
    return out;
  },
};

// Trilha ambiente provisória: acordes suaves (Am–F–C–G) com pad filtrado, 32 s em loop.
const trilhaAmbiente = () => {
  const bpm = 80;
  const compasso = (60 / bpm) * 4;
  const acordes = [
    [220, 261.63, 329.63],
    [174.61, 220, 261.63],
    [130.81, 196, 261.63],
    [196, 246.94, 293.66],
  ];
  const dur = compasso * 8;
  const N = n(dur);
  const out = new Float32Array(N);
  let lp = 0;
  for (let k = 0; k < N; k++) {
    const t = k / SR;
    const c = Math.floor(t / compasso) % acordes.length;
    const tc = (t % compasso) / compasso;
    const env1 = Math.min(1, tc * 6) * (1 - 0.35 * tc);
    let s = 0;
    for (const f of acordes[c]) {
      s += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.003 * t);
      s += 0.5 * Math.sin(2 * Math.PI * (f / 2) * t);
    }
    lp += 0.08 * (s - lp);
    const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.12 * t);
    out[k] = lp * env1 * lfo;
  }
  // Crossfade das pontas para o loop não estalar.
  const xf = n(0.5);
  for (let k = 0; k < xf; k++) {
    out[k] *= k / xf;
    out[N - 1 - k] *= k / xf;
  }
  return out;
};

let gerados = 0;
for (const [nome, fn] of Object.entries(SONS)) {
  const arq = path.join(DIR_SFX, `${nome}.wav`);
  if (fs.existsSync(arq) && !args.forcar) continue;
  gravarWav(arq, fn());
  gerados++;
}
const trilha = path.join(DIR_MUSICA, 'trilha-ambiente.mp3');
if (!fs.existsSync(trilha) || args.forcar) {
  const tmp = path.join(DIR_MUSICA, '.trilha.wav');
  gravarWav(tmp, trilhaAmbiente());
  executar('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-af', 'loudnorm=I=-20:TP=-2', '-ac', '2', '-b:a', '160k', trilha]);
  fs.unlinkSync(tmp);
  gerados++;
}
console.log(`✓ Efeitos em ${path.relative(process.cwd(), DIR_SFX) || DIR_SFX}: ${Object.keys(SONS).join(', ')} (${gerados} gerado(s) agora)`);
