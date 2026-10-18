#!/usr/bin/env node
// Extrai frames para o Claude analisar a gravação (rosto, enquadramento, zonas livres).
//   node frames.mjs <projeto> [--intervalo 2] [--tempos 3.2,10]
// Saída: frames/folha.jpg (folha de contato com tempos) + frames/f_<tempo>.jpg
import fs from 'node:fs';
import path from 'node:path';
import {argumentos, executar, lerJson, projeto} from './lib.mjs';

const args = argumentos();
const {dir, arq} = projeto(args._[0]);
const fonte = fs.existsSync(arq('editado.mp4')) ? arq('editado.mp4') : path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith('original.')));
const meta = fs.existsSync(arq('meta-editado.json')) ? lerJson(arq('meta-editado.json')) : lerJson(arq('meta.json'));
const pasta = arq('frames');
fs.rmSync(pasta, {recursive: true, force: true});
fs.mkdirSync(pasta, {recursive: true});

const intervalo = Number(args.intervalo ?? Math.min(6, Math.max(1.5, meta.duracao / 24)));
const tempos = args.tempos
  ? String(args.tempos).split(',').map(Number)
  : Array.from({length: Math.floor(meta.duracao / intervalo) + 1}, (_, k) => +(k * intervalo + 0.2).toFixed(2)).filter((t) => t < meta.duracao);

for (const t of tempos) {
  const rotulo = `drawtext=text='${t.toFixed(1)} s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6`;
  executar('ffmpeg', ['-y', '-v', 'error', '-ss', String(t), '-i', fonte, '-frames:v', '1', '-vf', `scale=512:-2,${rotulo}`, '-q:v', '4', path.join(pasta, `f_${t.toFixed(2).padStart(7, '0')}.jpg`)]);
}

// Folha de contato: até 24 quadros com o tempo desenhado.
const amostra = tempos.length <= 24 ? tempos : Array.from({length: 24}, (_, k) => tempos[Math.round((k * (tempos.length - 1)) / 23)]);
const cols = 6;
const linhas = Math.ceil(amostra.length / cols);
const lista = amostra.map((t) => `file '${path.join(pasta, `f_${t.toFixed(2).padStart(7, '0')}.jpg`)}'\nduration 1`).join('\n');
fs.writeFileSync(path.join(pasta, '.lista.txt'), lista + '\n');
executar('ffmpeg', [
  '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(pasta, '.lista.txt'),
  '-vf', `scale=256:-2,tile=${cols}x${linhas}:padding=4`,
  '-frames:v', '1', '-q:v', '4', path.join(pasta, 'folha.jpg'),
]);
fs.unlinkSync(path.join(pasta, '.lista.txt'));

console.log(`✓ ${tempos.length} frames (a cada ${intervalo.toFixed(1)} s) em ${pasta}
  folha de contato: ${path.join(pasta, 'folha.jpg')} (cada quadro traz o tempo no canto)
Próximo: o Claude lê a folha (e frames individuais se precisar) e grava analise-visual.json; depois escreve plano.json.`);
