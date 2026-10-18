import React, {useMemo} from 'react';
import {spring} from 'remotion';
import {FONTES, useTema} from '../tema';
import type {Legendas as ConfigLegendas, Palavra} from '../tipos';
import {normalizar} from '../util/tempo';

type Bloco = {palavras: Palavra[]; i: number; fimExibicao: number};

// Palavras que não devem ficar sozinhas no fim de um bloco ("com | o Claude" → "com o Claude").
const LIGACAO = new Set(['a', 'o', 'as', 'os', 'e', 'é', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'com', 'por', 'pra', 'para', 'que', 'se', 'ao', 'à', 'eu', 'ele', 'ela', 'me', 'te', 'lhe', 'mas', 'ou', 'nem']);

// Agrupa palavras em blocos curtos (estilo reels): quebra por quantidade, pontuação ou pausa.
// Em maiúsculas o texto é mais largo: blocos menores para caber em uma linha no 9:16.
export const montarBlocos = (palavras: Palavra[], porBloco: number, maxCaracteres = 20): Bloco[] => {
  const blocos: Bloco[] = [];
  let atual: Palavra[] = [];
  palavras.forEach((w, k) => {
    atual.push(w);
    const prox = palavras[k + 1];
    const chars = atual.reduce((n, p) => n + p.t.length + 1, 0);
    const fechar =
      !prox ||
      atual.length >= porBloco ||
      /[.!?…;:]$/.test(w.t) ||
      (/,$/.test(w.t) && atual.length >= 2) ||
      prox.i - w.f > 0.35 ||
      chars + prox.t.length > maxCaracteres;
    if (fechar) {
      // Fechou por tamanho com uma palavra de ligação no fim? Ela passa para o próximo bloco.
      const pontuado = /[.!?…;:,]$/.test(w.t);
      const pausa = prox ? prox.i - w.f > 0.35 : true;
      const carregar = !pontuado && !pausa && atual.length >= 2 && LIGACAO.has(w.t.toLowerCase());
      const leva = carregar ? atual.pop()! : null;
      const ult = atual[atual.length - 1];
      blocos.push({palavras: atual, i: atual[0].i, fimExibicao: ult.f + 0.25});
      atual = leva ? [leva] : [];
    }
  });
  // Sem buracos piscando: se o próximo bloco vem logo em seguida, o atual fica até ele.
  for (let k = 0; k < blocos.length - 1; k++) {
    const ult = blocos[k].palavras[blocos[k].palavras.length - 1];
    if (blocos[k + 1].i - ult.f < 0.6) blocos[k].fimExibicao = blocos[k + 1].i;
  }
  return blocos;
};

export const Legendas: React.FC<{
  t: number;
  fps: number;
  palavras: Palavra[];
  config: ConfigLegendas;
  tamanho: number; // px da fonte
}> = ({t, fps, palavras, config, tamanho}) => {
  const tema = useTema();
  const maiusculas = config.maiusculas !== false;
  const blocos = useMemo(
    () => montarBlocos(palavras, config.palavrasPorBloco ?? 3, maiusculas ? 16 : 20),
    [palavras, config.palavrasPorBloco, maiusculas],
  );
  const destaques = useMemo(() => new Set((config.destaques ?? []).map(normalizar)), [config.destaques]);
  const bloco = blocos.find((b) => t >= b.i && t < b.fimExibicao);
  if (!bloco) return null;

  const pop = spring({frame: Math.round((t - bloco.i) * fps), fps, config: {damping: 14, stiffness: 220, mass: 0.6}});

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: `0 ${tamanho * 0.28}px`,
        transform: `scale(${0.82 + 0.18 * pop})`,
        fontFamily: FONTES.titulo,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.25,
        textTransform: maiusculas ? 'uppercase' : 'none',
        textAlign: 'center',
      }}
    >
      {bloco.palavras.map((w, k) => {
        const prox = bloco.palavras[k + 1];
        const ativa = t >= w.i && t < (prox ? prox.i : bloco.fimExibicao);
        const chave = destaques.has(normalizar(w.t));
        return (
          <span
            key={k}
            style={{
              padding: `0 ${tamanho * 0.16}px`,
              borderRadius: tamanho * 0.18,
              background: ativa ? tema.destaque : 'transparent',
              color: ativa ? '#0a0f1e' : chave ? '#93c5fd' : '#ffffff',
              WebkitTextStroke: ativa ? '0px' : `${tamanho * 0.075}px #0a0f1e`,
              paintOrder: 'stroke fill',
              textShadow: ativa ? 'none' : `0 ${tamanho * 0.06}px ${tamanho * 0.12}px rgba(0,0,0,0.45)`,
              boxShadow: ativa ? `0 ${tamanho * 0.06}px ${tamanho * 0.2}px rgba(0,0,0,0.35)` : 'none',
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};
