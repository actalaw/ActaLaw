#!/usr/bin/env node
// Renderiza stills de QA e o vídeo final com Remotion.
//
//   node render.mjs <projeto> --stills              → qa/<cena>-<formato>.png + qa/folha-<formato>.jpg
//   node render.mjs <projeto> --tempos 12.5,30      → stills nesses instantes
//   node render.mjs <projeto>                        → saida/<slug>-<formato>.mp4 (formatos do plano)
//   node render.mjs <projeto> --previa               → metade da resolução, rápido
//   node render.mjs <projeto> --de 10 --ate 20       → só um trecho
//   node render.mjs --galeria [--stills] [--saida d] → demonstração de todos os templates, sem vídeo
//   --formatos 9x16,1x1,16x9 sobrescreve os formatos do plano.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {argumentos, ESTUDIO, executar, falhar, VIDEOS} from './lib.mjs';
import {plano2md, resolverPlano} from './plano.mjs';

const args = argumentos();
const require = createRequire(path.join(ESTUDIO, 'package.json'));
if (!fs.existsSync(path.join(ESTUDIO, 'node_modules', 'remotion'))) falhar('Dependências ausentes: rode scripts/setup.sh');
const {bundle} = require('@remotion/bundler');
const {renderMedia, renderStill, selectComposition} = require('@remotion/renderer');

const navegador = () => {
  if (process.env.REMOTION_BROWSER) return process.env.REMOTION_BROWSER;
  const base = '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined; // Remotion baixa o próprio Chrome Headless Shell
  const dir = fs.readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell-')).sort().pop();
  const exe = dir && path.join(base, dir, 'chrome-linux', 'headless_shell');
  return exe && fs.existsSync(exe) ? exe : undefined;
};
const browserExecutable = navegador();

// ---------- montar inputProps ----------
let dir;
let slug;
let inputProps;
let formatos;
const publicAtual = path.join(ESTUDIO, 'public', 'atual');

if (args.galeria) {
  dir = path.resolve(args.saida ?? path.join(VIDEOS, '_galeria'));
  slug = 'galeria';
  fs.mkdirSync(dir, {recursive: true});
  inputProps = undefined; // usa defaultProps (src/demo.ts)
  formatos = (args.formatos ?? '9x16').split(',');
} else {
  const ref = args._[0];
  dir = fs.existsSync(ref ?? '') ? path.resolve(ref) : path.join(VIDEOS, ref ?? '');
  if (!ref || !fs.existsSync(dir)) falhar(`Projeto não encontrado: ${dir}`);
  slug = path.basename(dir);
  const r = resolverPlano(dir);
  fs.writeFileSync(path.join(dir, 'plano.md'), plano2md(r, dir));
  if (r.erros.length) falhar(`Plano com erros — corrija antes de renderizar:\n- ${r.erros.join('\n- ')}`);
  for (const a of r.avisos) console.warn(`⚠ ${a}`);
  const editado = path.join(dir, 'editado.mp4');
  if (!fs.existsSync(editado)) falhar('Falta editado.mp4 — rode aplicar-cortes.mjs');

  // public/atual recebe o vídeo do projeto (link físico, sem copiar bytes quando possível)
  fs.rmSync(publicAtual, {recursive: true, force: true});
  fs.mkdirSync(publicAtual, {recursive: true});
  const ligar = (de, para) => {
    try {
      fs.linkSync(de, para);
    } catch {
      fs.copyFileSync(de, para);
    }
  };
  ligar(editado, path.join(publicAtual, 'editado.mp4'));
  const plano = r.resolvido;
  if (plano.trilha?.arquivo && fs.existsSync(path.join(dir, plano.trilha.arquivo))) {
    const nome = path.basename(plano.trilha.arquivo);
    ligar(path.join(dir, plano.trilha.arquivo), path.join(publicAtual, nome));
    plano.trilha = {...plano.trilha, arquivo: `atual/${nome}`};
  }
  inputProps = {video: 'atual/editado.mp4', duracao: r.meta.duracao, fps: plano.fps ?? 30, palavras: r.palavras, plano};
  formatos = (args.formatos ?? (plano.formatos ?? ['9x16']).join(',')).split(',');
}

// ---------- bundle (uma vez) ----------
const t0 = Date.now();
process.stdout.write('• Empacotando o estúdio… ');
const serveUrl = await bundle({entryPoint: path.join(ESTUDIO, 'src', 'index.ts'), publicDir: path.join(ESTUDIO, 'public')});
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);

const escala = args.previa ? 0.5 : 1;
const concurrency = Math.max(1, os.cpus().length);

for (const formato of formatos) {
  const id = `Video${formato}`;
  const composition = await selectComposition({serveUrl, id, inputProps, browserExecutable, logLevel: 'error'});
  const fps = composition.fps;

  if (args.stills || args.tempos) {
    const qa = path.join(dir, 'qa');
    fs.mkdirSync(qa, {recursive: true});
    const plano = inputProps?.plano ?? composition.props.plano;
    const alvos = args.tempos
      ? String(args.tempos).split(',').map((s, k) => ({nome: `t${k + 1}-${s}s`, t: Number(s)}))
      : plano.cenas.map((c) => ({nome: c.id, t: c.inicio + Math.max(0.3, Math.min((c.fim - c.inicio) * 0.75, c.fim - c.inicio - 0.4))}));
    const arquivos = [];
    for (const [k, a] of alvos.entries()) {
      const frame = Math.min(composition.durationInFrames - 1, Math.max(0, Math.round(a.t * fps)));
      const output = path.join(qa, `${String(k + 1).padStart(2, '0')}-${a.nome}-${formato}.png`);
      await renderStill({composition, serveUrl, output, frame, inputProps, browserExecutable, scale: 0.5, logLevel: 'error'});
      arquivos.push(output);
    }
    // Folha de contato numerada (mesma ordem da tabela do plano.md)
    if (arquivos.length > 1) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'folha-'));
      arquivos.forEach((a, k) => fs.copyFileSync(a, path.join(tmp, `${String(k).padStart(3, '0')}.png`)));
      const cols = Math.min(4, arquivos.length);
      const linhas = Math.ceil(arquivos.length / cols);
      const largura = formato === '16x9' ? 480 : 300;
      const folha = path.join(qa, `folha-${formato}.jpg`);
      executar('ffmpeg', [
        '-y', '-v', 'error', '-i', path.join(tmp, '%03d.png'),
        '-vf', `scale=${largura}:-2,drawtext=text='%{eif\\:n+1\\:d}':x=12:y=10:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8,tile=${cols}x${linhas}:padding=6:color=0x0a0f1e`,
        '-frames:v', '1', '-q:v', '3', folha,
      ]);
      fs.rmSync(tmp, {recursive: true, force: true});
      console.log(`✓ ${arquivos.length} stills em ${qa} · folha: ${folha}`);
    } else console.log(`✓ still: ${arquivos[0]}`);
    continue;
  }

  const saida = path.join(dir, 'saida');
  fs.mkdirSync(saida, {recursive: true});
  const de = args.de !== undefined ? Math.round(Number(args.de) * fps) : 0;
  const ate = args.ate !== undefined ? Math.round(Number(args.ate) * fps) : composition.durationInFrames - 1;
  const sufixo = `${args.previa ? '-previa' : ''}${args.de !== undefined || args.ate !== undefined ? `-trecho` : ''}`;
  const outputLocation = path.join(saida, `${slug}-${formato}${sufixo}.mp4`);
  let ultimo = -10;
  const t1 = Date.now();
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: args.previa ? 28 : 18,
    audioBitrate: '192k',
    scale: escala,
    frameRange: [Math.max(0, de), Math.min(composition.durationInFrames - 1, ate)],
    outputLocation,
    inputProps,
    browserExecutable,
    concurrency,
    logLevel: 'error',
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 100);
      if (p >= ultimo + 10) {
        ultimo = p;
        process.stdout.write(`  ${formato}: ${p}%\n`);
      }
    },
  });
  console.log(`✓ ${outputLocation} (${((Date.now() - t1) / 1000).toFixed(0)} s)`);
}
