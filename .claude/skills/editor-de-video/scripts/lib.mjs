// Utilitários compartilhados pelos scripts do editor de vídeo (Node 18+, sem dependências).
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ESTUDIO = path.join(SKILL, 'estudio');
export const REPO = path.resolve(SKILL, '..', '..', '..');
export const VIDEOS = path.join(REPO, 'videos');

// --chave valor / --flag / posicionais
export const argumentos = (argv = process.argv.slice(2)) => {
  const out = {_: []};
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a.startsWith('--')) {
      const [nome, valorInline] = a.slice(2).split('=', 2);
      if (valorInline !== undefined) out[nome] = valorInline;
      else if (argv[k + 1] !== undefined && !argv[k + 1].startsWith('--')) out[nome] = argv[++k];
      else out[nome] = true;
    } else out._.push(a);
  }
  return out;
};

export const falhar = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

export const executar = (cmd, args, {silencioso = true} = {}) => {
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 28, stdio: silencioso ? 'pipe' : 'inherit'});
  if (r.error) falhar(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) falhar(`${cmd} saiu com código ${r.status}\n${(r.stderr || '').split('\n').slice(-15).join('\n')}`);
  return r;
};

export const lerJson = (arq) => JSON.parse(fs.readFileSync(arq, 'utf8'));
export const gravarJson = (arq, dados) => fs.writeFileSync(arq, JSON.stringify(dados, null, 2) + '\n');

// Resolve a pasta de trabalho de um projeto: aceita slug ("meu-video") ou caminho.
export const projeto = (ref) => {
  if (!ref) falhar('Informe o projeto (slug em videos/ ou caminho da pasta).');
  const dir = fs.existsSync(ref) && fs.statSync(ref).isDirectory() ? path.resolve(ref) : path.join(VIDEOS, ref);
  if (!fs.existsSync(dir)) falhar(`Projeto não encontrado: ${dir}`);
  return {dir, arq: (nome) => path.join(dir, nome), slug: path.basename(dir)};
};

export const slugificar = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'video';

export const sondar = (arquivo) => {
  const r = executar('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', arquivo]);
  const info = JSON.parse(r.stdout);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  const [num, den] = (v?.avg_frame_rate || '30/1').split('/').map(Number);
  let rotacao = Number(v?.tags?.rotate || 0);
  const dm = v?.side_data_list?.find((d) => d.rotation !== undefined);
  if (dm) rotacao = Number(dm.rotation);
  let [largura, altura] = [v?.width, v?.height];
  if (Math.abs(rotacao) % 180 === 90) [largura, altura] = [altura, largura];
  return {
    duracao: Number(info.format.duration),
    largura,
    altura,
    fps: den ? +(num / den).toFixed(3) : 30,
    rotacao,
    temAudio: Boolean(a),
    tamanhoMB: +(Number(info.format.size) / 1e6).toFixed(1),
  };
};

export const normalizar = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const fmt = (s) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};
