import React from 'react';
import {interpolate} from 'remotion';
import {FONTES, MARCA, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {CenaComponente, Centro, Titulo, useCena} from './base';

// Quiz: pergunta + opções; a correta é revelada em `revelarEm`.
// props: { pergunta, opcoes: string[], correta?: índice, revelarEm? }
export const Pergunta: CenaComponente = (p) => {
  const {frame, entrada, saida, emFrame} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const opcoes: string[] = Array.isArray(p.props.opcoes) ? p.props.opcoes : [];
  const correta = typeof p.props.correta === 'number' ? p.props.correta : -1;
  const revelar = emFrame(p.props.revelarEm, Math.round(p.duracao * 0.7));
  const r = interpolate(frame, [revelar, revelar + 8], [0, 1], clamp);

  return (
    <Centro style={{opacity: saida, padding: 6 * u, gap: 3.5 * u}}>
      <Titulo tamanho={6.4} style={{opacity: entrada(0), maxWidth: 88 * u}}>
        {p.props.pergunta}
      </Titulo>
      <div style={{display: 'flex', flexDirection: 'column', gap: 1.8 * u, width: '100%', maxWidth: 80 * u}}>
        {opcoes.map((o, i) => {
          const s = entrada(8 + i * 4);
          const certa = i === correta;
          const fundo = certa ? `rgba(52, 211, 153, ${0.2 * r})` : tema.superficie;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2.4 * u,
                padding: `${2.2 * u}px ${3 * u}px`,
                borderRadius: 2.2 * u,
                background: fundo,
                border: `${0.3 * u}px solid ${certa && r > 0 ? MARCA.bom : tema.borda}`,
                opacity: interpolate(s, [0, 0.5], [0, 1], clamp) * (correta >= 0 && !certa ? 1 - 0.55 * r : 1),
                transform: `translateX(${(1 - s) * 8 * u}px) scale(${certa ? 1 + 0.04 * r : 1})`,
              }}
            >
              <div style={{fontFamily: FONTES.titulo, fontWeight: 800, fontSize: 4 * u, color: certa && r > 0 ? MARCA.bom : tema.destaque}}>
                {certa && r > 0.5 ? '✓' : String.fromCharCode(65 + i)}
              </div>
              <div style={{fontFamily: FONTES.ui, fontWeight: 600, fontSize: 4.4 * u, color: tema.texto}}>{o}</div>
            </div>
          );
        })}
      </div>
    </Centro>
  );
};
