import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Ponto, Zoom} from '../tipos';
import {envelope} from '../util/tempo';

// Aplica os zooms do plano. "suave" = rampa de 0,4 s; "punch" = corte seco (jump zoom).
export const Camera: React.FC<{t: number; zooms: Zoom[]; foco: Ponto; children: React.ReactNode}> = ({
  t,
  zooms,
  foco,
  children,
}) => {
  let escala = 1;
  let origem = foco;
  for (const z of zooms) {
    const rampa = z.tipo === 'punch' ? 0.07 : 0.4;
    const e = envelope(t, z.inicio + rampa, z.fim, rampa);
    const s = 1 + (z.escala - 1) * e;
    if (s > escala) {
      escala = s;
      origem = z.foco ?? foco;
    }
  }
  return (
    <AbsoluteFill style={{transform: `scale(${escala})`, transformOrigin: `${origem.x * 100}% ${origem.y * 100}%`}}>
      {children}
    </AbsoluteFill>
  );
};
