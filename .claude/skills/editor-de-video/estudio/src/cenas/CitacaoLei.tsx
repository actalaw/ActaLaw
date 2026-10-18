import React from 'react';
import {interpolate} from 'remotion';
import {FONTES, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {CenaComponente, Centro, useCena} from './base';

// Trecho de lei, súmula ou acórdão, revelado palavra a palavra.
// props: { texto, fonte (ex.: "Art. 5º, LXVIII — CF/88"), ateEm? (tempo em que termina de aparecer) }
export const CitacaoLei: CenaComponente = (p) => {
  const {frame, entrada, suave, saida, emFrame} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const palavras = String(p.props.texto ?? '').split(/\s+/).filter(Boolean);
  const fimRevelar = Math.max(12, emFrame(p.props.ateEm, Math.round(p.duracao * 0.6)));
  const visiveis = interpolate(frame, [6, fimRevelar], [0, palavras.length], clamp);
  const aspas = entrada(0, {damping: 10});
  const tamanho = palavras.length > 30 ? 4.4 : palavras.length > 16 ? 5.2 : 6.2;

  return (
    <Centro style={{opacity: saida, padding: `${6 * u}px ${8 * u}px`, alignItems: 'flex-start'}}>
      <div
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 22 * u,
          lineHeight: 0.6,
          height: 9 * u,
          color: tema.destaque,
          transform: `scale(${aspas})`,
          transformOrigin: 'left top',
        }}
      >
        “
      </div>
      <div
        style={{
          fontFamily: FONTES.titulo,
          fontWeight: 600,
          fontSize: tamanho * u,
          lineHeight: 1.32,
          color: tema.primaria,
        }}
      >
        {palavras.map((w, i) => (
          <span
            key={i}
            style={{opacity: interpolate(visiveis - i, [0, 1], [0.12, 1], clamp)}}
          >
            {w}{' '}
          </span>
        ))}
      </div>
      {p.props.fonte ? (
        <div style={{display: 'flex', alignItems: 'center', gap: 2 * u, marginTop: 3 * u, opacity: suave(fimRevelar - 4)}}>
          <div style={{width: 6 * u, height: 0.5 * u, background: tema.destaque}} />
          <div
            style={{
              fontFamily: FONTES.ui,
              fontWeight: 600,
              fontSize: 3.4 * u,
              letterSpacing: 0.25 * u,
              textTransform: 'uppercase',
              color: tema.muted,
            }}
          >
            {p.props.fonte}
          </div>
        </div>
      ) : null}
    </Centro>
  );
};
