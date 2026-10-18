#!/usr/bin/env node
// Cria a pasta de trabalho videos/<slug>/ a partir de um vídeo bruto.
//   node ingerir.mjs <arquivo> [--slug nome] [--substituir]
import fs from 'node:fs';
import path from 'node:path';
import {argumentos, executar, falhar, gravarJson, slugificar, sondar, VIDEOS} from './lib.mjs';

const args = argumentos();
const origem = args._[0];
if (!origem || !fs.existsSync(origem)) falhar(`Arquivo não encontrado: ${origem}`);

let slug = slugificar(args.slug ?? path.basename(origem));
let dir = path.join(VIDEOS, slug);
if (fs.existsSync(dir)) {
  if (args.substituir) fs.rmSync(dir, {recursive: true, force: true});
  else if (args.slug) falhar(`Já existe ${dir} (use --substituir para recomeçar)`);
  else {
    let n = 2;
    while (fs.existsSync(`${dir}-${n}`)) n++;
    dir = `${dir}-${n}`;
    slug = path.basename(dir);
  }
}
fs.mkdirSync(dir, {recursive: true});

const ext = path.extname(origem).toLowerCase() || '.mp4';
const original = path.join(dir, `original${ext}`);
try {
  fs.linkSync(path.resolve(origem), original);
} catch {
  fs.copyFileSync(origem, original);
}

const meta = {...sondar(original), arquivoOriginal: path.basename(origem)};
gravarJson(path.join(dir, 'meta.json'), meta);

if (meta.temAudio) {
  executar('ffmpeg', ['-y', '-v', 'error', '-i', original, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', path.join(dir, 'audio.mp3')]);
}

console.log(`✓ Projeto: ${slug}
  pasta: ${dir}
  duração: ${meta.duracao.toFixed(1)} s · ${meta.largura}×${meta.altura} · ${meta.fps} fps · ${meta.tamanhoMB} MB${meta.temAudio ? '' : ' · SEM ÁUDIO'}
Próximo: node scripts/transcrever.mjs ${slug}`);
