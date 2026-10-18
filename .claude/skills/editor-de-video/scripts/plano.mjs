#!/usr/bin/env node
// Resolve e valida o plano de cenas.
//   node plano.mjs <projeto>          → grava plano.resolvido.json + plano.md e imprime o resumo
//
// O Claude escreve plano.json usando PALAVRAS-GATILHO ("gatilho": "habeas corpus") em vez de
// segundos; este script encontra cada palavra na transcrição e calcula os tempos exatos.
// Ver referencia/plano-schema.md.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {argumentos, ESTUDIO, falhar, fmt, gravarJson, lerJson, normalizar, projeto} from './lib.mjs';

const ANTECIPAR = 0.12; // a cena começa um pouco antes da palavra ser dita
const DURACAO_PADRAO = 2.8;

const cenasConhecidas = () => {
  const ler = (arq) => (fs.existsSync(arq) ? fs.readFileSync(arq, 'utf8') : '');
  const idx = ler(path.join(ESTUDIO, 'src/cenas/index.ts'));
  const bloco = idx.slice(idx.indexOf('CENAS'));
  const nomes = [...bloco.matchAll(/^\s+([A-Z]\w*),$/gm)].map((m) => m[1]);
  const custom = ler(path.join(ESTUDIO, 'src/cenas/custom/index.ts'));
  const m = custom.match(/CUSTOM[^=]*=\s*\{([^}]*)\}/);
  if (m) nomes.push(...m[1].split(',').map((s) => s.trim().split(':')[0].trim()).filter(Boolean));
  return new Set(nomes);
};

// Procura uma frase (1+ palavras) na transcrição. Retorna todas as ocorrências {i, f, k}.
const ocorrencias = (palavras, frase) => {
  const alvo = String(frase).replace(/^@/, '').split(/\s+/).map(normalizar).filter(Boolean);
  const norm = palavras.map((w) => normalizar(w.t));
  const out = [];
  for (let k = 0; k + alvo.length <= norm.length; k++) {
    if (alvo.every((a, j) => norm[k + j] === a || (j === alvo.length - 1 && norm[k + j].startsWith(a)))) {
      out.push({i: palavras[k].i, f: palavras[k + alvo.length - 1].f, k});
    }
  }
  return out;
};

export const resolverPlano = (dir) => {
  const arq = (n) => path.join(dir, n);
  if (!fs.existsSync(arq('plano.json'))) falhar(`Falta ${arq('plano.json')}`);
  const plano = lerJson(arq('plano.json'));
  const palavras = fs.existsSync(arq('transcricao-editada.json')) ? lerJson(arq('transcricao-editada.json')).palavras : [];
  const meta = fs.existsSync(arq('meta-editado.json')) ? lerJson(arq('meta-editado.json')) : {duracao: Infinity};
  const avisos = [];
  const erros = [];

  const achar = (frase, {depoisDe = -Infinity, perto, ocorrencia, contexto}) => {
    const lista = ocorrencias(palavras, frase);
    if (!lista.length) {
      erros.push(`${contexto}: "${frase}" não aparece na transcrição`);
      return null;
    }
    if (ocorrencia) return lista[ocorrencia - 1] ?? (erros.push(`${contexto}: só há ${lista.length} ocorrência(s) de "${frase}"`), null);
    if (typeof perto === 'number') return lista.reduce((a, b) => (Math.abs(b.i - perto) < Math.abs(a.i - perto) ? b : a));
    return lista.find((o) => o.i >= depoisDe - 0.3) ?? lista[lista.length - 1];
  };

  // Resolve campos de tempo dentro das props: qualquer chave "em"/"...Em" com "@palavra".
  const resolverProps = (obj, cena) => {
    if (Array.isArray(obj)) return obj.map((x) => resolverProps(x, cena));
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if ((k === 'em' || /Em$/.test(k)) && typeof v === 'string' && v.startsWith('@')) {
        const o = achar(v, {depoisDe: cena.inicio, contexto: `cena ${cena.id} · ${k}`});
        out[k] = o ? +o.i.toFixed(3) : undefined;
      } else out[k] = resolverProps(v, cena);
    }
    return out;
  };

  let cursor = 0;
  const cenas = (plano.cenas ?? []).map((c, n) => {
    const cena = {...c, id: c.id ?? `c${n + 1}`};
    const ctx = `cena ${cena.id} (${cena.tipo})`;
    if (cena.gatilho) {
      const o = achar(cena.gatilho, {depoisDe: cursor, perto: c.inicio, ocorrencia: c.ocorrencia, contexto: ctx});
      if (o) cena.inicio = Math.max(0, o.i - (c.antecipar ?? ANTECIPAR));
    }
    if (typeof cena.inicio !== 'number') {
      erros.push(`${ctx}: sem "gatilho" nem "inicio"`);
      cena.inicio = cursor;
    }
    if (cena.ate) {
      const o = achar(cena.ate, {depoisDe: cena.inicio, contexto: `${ctx} · ate`});
      if (o) cena.fim = o.f + 0.35;
    } else if (typeof c.duracao === 'number') cena.fim = cena.inicio + c.duracao;
    if (typeof cena.fim !== 'number') cena.fim = cena.inicio + DURACAO_PADRAO;
    const limite = meta.duracao + (plano.extraFinal ?? 0);
    if (cena.fim > limite) cena.fim = limite;
    if (cena.fim - cena.inicio < 0.6) avisos.push(`${ctx}: dura só ${(cena.fim - cena.inicio).toFixed(2)} s`);
    cena.props = resolverProps(cena.props ?? {}, cena);
    cena.inicio = +cena.inicio.toFixed(3);
    cena.fim = +cena.fim.toFixed(3);
    cursor = cena.inicio;
    return cena;
  });

  const conhecidas = cenasConhecidas();
  for (const c of cenas) if (!conhecidas.has(c.tipo)) erros.push(`cena ${c.id}: tipo "${c.tipo}" não existe (disponíveis: ${[...conhecidas].join(', ')})`);

  // Sobreposição de cenas no mesmo layout
  const layout = (c) => c.layout ?? plano.layoutPadrao ?? 'split';
  const ord = [...cenas].sort((a, b) => a.inicio - b.inicio);
  for (let k = 1; k < ord.length; k++) {
    const [a, b] = [ord[k - 1], ord[k]];
    if (layout(a) === layout(b) && b.inicio < a.fim - 0.05)
      avisos.push(`cenas ${a.id} e ${b.id} se sobrepõem (${fmt(b.inicio)} < ${fmt(a.fim)}) no layout ${layout(a)}`);
  }

  const zooms = (plano.zooms ?? []).map((z, n) => {
    const out = {...z};
    if (z.gatilho) {
      const o = achar(z.gatilho, {perto: z.inicio, ocorrencia: z.ocorrencia, contexto: `zoom ${n + 1}`});
      if (o) out.inicio = +(o.i - 0.05).toFixed(3);
    }
    if (z.ate) {
      const o = achar(z.ate, {depoisDe: out.inicio, contexto: `zoom ${n + 1} · ate`});
      if (o) out.fim = +(o.f + 0.2).toFixed(3);
    }
    if (typeof out.fim !== 'number') out.fim = out.inicio + (z.duracao ?? 1.6);
    out.escala = out.escala ?? 1.2;
    return out;
  });

  const sfx = (plano.sfx ?? []).map((s, n) => {
    if (typeof s.em === 'number') return s;
    const o = s.gatilho ? achar(s.gatilho, {perto: s.perto, contexto: `sfx ${n + 1}`}) : null;
    return {...s, em: o ? +o.i.toFixed(3) : 0};
  });
  const sons = new Set(fs.readdirSync(path.join(ESTUDIO, 'public/sfx')).map((f) => f.replace(/\.wav$/, '')));
  for (const s of [...cenas.map((c) => c.sfx).filter(Boolean), ...sfx.map((s) => s.som)])
    if (!sons.has(s)) erros.push(`sfx "${s}" não existe (disponíveis: ${[...sons].join(', ')})`);

  if (plano.trilha?.arquivo) {
    const emProjeto = path.join(dir, plano.trilha.arquivo);
    const emPublic = path.join(ESTUDIO, 'public', plano.trilha.arquivo);
    if (!fs.existsSync(emProjeto) && !fs.existsSync(emPublic)) erros.push(`trilha "${plano.trilha.arquivo}" não encontrada`);
  }

  const resolvido = {...plano, cenas, zooms, sfx};
  return {resolvido, palavras, meta, avisos, erros};
};

const contexto = (palavras, t, raio = 3) => {
  const k = palavras.findIndex((w) => w.f >= t);
  if (k < 0) return '';
  return palavras
    .slice(Math.max(0, k - 1), k + raio)
    .map((w, j) => (j === (k > 0 ? 1 : 0) ? `**${w.t}**` : w.t))
    .join(' ');
};

const resumoProps = (c) => {
  const p = c.props ?? {};
  const txt = p.texto ?? p.titulo ?? p.pergunta ?? (Array.isArray(p.itens) ? p.itens.map((i) => i.texto ?? i).join(' · ') : '') ??
    '';
  const extra = Array.isArray(p.eventos)
    ? p.eventos.map((e) => e.data).join(' → ')
    : p.esquerda || p.direita
      ? `${p.esquerda?.titulo ?? ''} × ${p.direita?.titulo ?? ''}`
      : p.ate !== undefined
        ? `${p.prefixo ?? ''}${p.ate}${p.sufixo ?? ''}`
        : '';
  return String(txt || extra).slice(0, 70);
};

export const plano2md = ({resolvido: p, palavras, meta, avisos, erros}, dir) => {
  const L = [];
  L.push(`# Plano — ${p.titulo ?? path.basename(dir)}`, '');
  L.push(`Duração editada: **${fmt(meta.duracao)}**${p.extraFinal ? ` + ${p.extraFinal} s de encerramento` : ''} · tema **${p.tema ?? 'escuro'}** · layout padrão **${p.layoutPadrao ?? 'split'}** · formatos **${(p.formatos ?? ['9x16']).join(', ')}**`, '');
  const cortes = path.join(dir, 'cortes.json');
  if (fs.existsSync(cortes)) {
    const c = lerJson(cortes);
    L.push(`Cortes: ${fmt(c.duracaoOriginal)} → ${fmt(c.duracaoFinal)} (−${(c.duracaoOriginal - c.duracaoFinal).toFixed(1)} s, ${c.removidos.length} trechos removidos)`, '');
  }
  L.push('| # | Tempo | Layout | Cena | Na fala | Conteúdo | SFX |', '|---|---|---|---|---|---|---|');
  p.cenas.forEach((c, n) =>
    L.push(
      `| ${n + 1} | ${fmt(c.inicio)}–${fmt(c.fim)} | ${c.layout ?? p.layoutPadrao ?? 'split'}${c.posicao ? `/${c.posicao}` : ''} | ${c.tipo} | ${contexto(palavras, c.inicio + 0.12)} | ${resumoProps(c)} | ${c.sfx ?? ''} |`,
    ),
  );
  if (p.zooms?.length) {
    L.push('', '**Zooms:** ' + p.zooms.map((z) => `${fmt(z.inicio)} ${z.tipo ?? 'suave'} ×${z.escala}`).join(' · '));
  }
  L.push('', `**Trilha:** ${p.trilha?.arquivo ?? 'nenhuma'}${p.trilha ? ` (volume ${p.trilha.volume ?? 0.22}, com fala ${p.trilha.volumeComFala ?? 0.07})` : ''}`);
  L.push(`**Legendas:** ${p.legendas?.ativo === false ? 'desligadas' : `${p.legendas?.palavrasPorBloco ?? 3} palavras por bloco; destaques: ${(p.legendas?.destaques ?? []).join(', ') || '—'}`}`);
  if (erros.length) L.push('', '## ✖ Erros', ...erros.map((e) => `- ${e}`));
  if (avisos.length) L.push('', '## ⚠ Avisos', ...avisos.map((a) => `- ${a}`));
  return L.join('\n') + '\n';
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = argumentos();
  const {dir, arq} = projeto(args._[0]);
  const r = resolverPlano(dir);
  gravarJson(arq('plano.resolvido.json'), r.resolvido);
  const md = plano2md(r, dir);
  fs.writeFileSync(arq('plano.md'), md);
  console.log(md);
  if (r.erros.length) process.exit(2);
}
