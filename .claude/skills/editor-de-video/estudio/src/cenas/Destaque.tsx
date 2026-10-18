import React from 'react';
import {interpolate} from 'remotion';
import {useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {CenaComponente, Centro, Texto, Titulo, useCena} from './base';

// Palavra/frase de impacto, opcionalmente com emoji e subtítulo.
// props: { texto, sub?, emoji? }
export const Destaque: CenaComponente = (p) => {
  const {entrada, suave, saida} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const {texto = '', sub, emoji} = p.props;
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  const atrasoTexto = emoji ? 5 : 0;
  const barra = suave(atrasoTexto + 6 + palavras.length * 3);

  return (
    <Centro style={{opacity: saida, padding: 6 * u, gap: 2.5 * u}}>
      {emoji ? (
        <div style={{fontSize: 16 * u, transform: `scale(${entrada(0, {damping: 9})}) rotate(${interpolate(entrada(0, {damping: 9}), [0, 1], [-25, 0])}deg)`}}>
          {emoji}
        </div>
      ) : null}
      <Titulo tamanho={palavras.length > 4 ? 8 : 11}>
        {palavras.map((w, i) => {
          const s = entrada(atrasoTexto + i * 3);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: '0.25em',
                opacity: interpolate(s, [0, 0.4], [0, 1], clamp),
                transform: `translateY(${(1 - s) * 40}%) scale(${0.85 + 0.15 * s})`,
              }}
            >
              {w}
            </span>
          );
        })}
      </Titulo>
      <div style={{height: 0.9 * u, width: 22 * u * barra, borderRadius: u, background: tema.destaque}} />
      {sub ? (
        <Texto tamanho={4.4} style={{opacity: suave(atrasoTexto + 14), textAlign: 'center', color: tema.muted}}>
          {sub}
        </Texto>
      ) : null}
    </Centro>
  );
};
