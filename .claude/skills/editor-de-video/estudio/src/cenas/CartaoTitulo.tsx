import React from 'react';
import {FONTES, useCaixa, useTema} from '../tema';
import {CenaComponente, Centro, Rotulo, useCena} from './base';

// Cartão inclinado com rótulo, título, valor e etiqueta (ex.: produto, lei, prazo).
// props: { rotulo?, titulo, detalhe?, valor?, etiqueta?, inclinacao? }
export const CartaoTitulo: CenaComponente = (p) => {
  const {entrada, suave, saida} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const {rotulo, titulo = '', detalhe, valor, etiqueta, inclinacao = -3} = p.props;
  const s = entrada(0, {damping: 13});

  return (
    <Centro style={{opacity: saida}}>
      <div
        style={{
          transform: `translateY(${(1 - s) * 30 * u}px) rotate(${inclinacao * s}deg) scale(${0.9 + 0.1 * s})`,
          background: tema.escuro ? '#0f172a' : '#111827',
          color: '#fff',
          borderRadius: 3 * u,
          padding: `${4 * u}px ${5 * u}px`,
          minWidth: 55 * u,
          maxWidth: 82 * u,
          boxShadow: `0 ${3 * u}px ${8 * u}px rgba(0,0,0,0.35)`,
          border: `1px solid ${tema.borda}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.6 * u,
        }}
      >
        {rotulo ? <Rotulo style={{opacity: suave(6), color: '#93c5fd'}}>{rotulo}</Rotulo> : null}
        <div style={{fontFamily: FONTES.titulo, fontWeight: 800, fontSize: 7 * u, lineHeight: 1.1}}>{titulo}</div>
        {detalhe ? (
          <div style={{fontFamily: FONTES.ui, fontSize: 3.8 * u, color: '#cbd5e1', opacity: suave(10)}}>{detalhe}</div>
        ) : null}
        {valor || etiqueta ? (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 * u, marginTop: u}}>
            {valor ? (
              <div style={{fontFamily: FONTES.titulo, fontWeight: 700, fontSize: 6.5 * u, opacity: suave(12)}}>{valor}</div>
            ) : (
              <span />
            )}
            {etiqueta ? (
              <div
                style={{
                  transform: `scale(${entrada(16, {damping: 10})})`,
                  background: tema.destaque,
                  color: '#0a0f1e',
                  fontFamily: FONTES.ui,
                  fontWeight: 700,
                  fontSize: 3 * u,
                  letterSpacing: 0.2 * u,
                  textTransform: 'uppercase',
                  padding: `${1.2 * u}px ${2.6 * u}px`,
                  borderRadius: 1.4 * u,
                }}
              >
                {etiqueta}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Centro>
  );
};
