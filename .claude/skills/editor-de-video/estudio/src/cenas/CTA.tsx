import React from 'react';
import {FONTES, MARCA, useCaixa, useTema} from '../tema';
import {CenaComponente, Centro, Texto, useCena} from './base';

// Encerramento com a marca ActaLaw e chamada para ação.
// props: { texto?, handle?, site? }
export const CTA: CenaComponente = (p) => {
  const {entrada, suave, saida} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const {texto = 'Direito em palavras que você entende', handle = '@acta.law', site} = p.props;
  const s = entrada(0, {damping: 12});

  return (
    <Centro style={{opacity: saida, gap: 3 * u}}>
      <div
        style={{
          width: 18 * u,
          height: 18 * u,
          borderRadius: '50%',
          border: `${0.5 * u}px solid ${tema.destaque}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9 * u,
          transform: `scale(${s}) rotate(${(1 - s) * -90}deg)`,
        }}
      >
        ⚖️
      </div>
      <div style={{fontFamily: FONTES.titulo, fontWeight: 800, fontSize: 12 * u, letterSpacing: -0.3 * u, transform: `translateY(${(1 - suave(4)) * 4 * u}px)`, opacity: suave(4)}}>
        <span style={{color: tema.escuro ? '#ffffff' : MARCA.navy}}>Acta</span>
        <span style={{color: MARCA.sky}}>Law</span>
      </div>
      <Texto tamanho={4.4} style={{color: tema.muted, opacity: suave(10), textAlign: 'center'}}>
        {texto}
      </Texto>
      <div
        style={{
          marginTop: 2 * u,
          padding: `${1.6 * u}px ${4 * u}px`,
          borderRadius: 10 * u,
          background: tema.destaque,
          color: '#0a0f1e',
          fontFamily: FONTES.ui,
          fontWeight: 700,
          fontSize: 4.6 * u,
          transform: `scale(${entrada(14, {damping: 10})})`,
        }}
      >
        Siga {handle}
      </div>
      {site ? (
        <Texto tamanho={3.6} style={{color: tema.muted, opacity: suave(20)}}>
          {site}
        </Texto>
      ) : null}
    </Centro>
  );
};
