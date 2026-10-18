import React from 'react';
import {interpolate} from 'remotion';
import {FONTES, MARCA, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {CenaComponente, Centro, itens, Texto, useCena} from './base';

type Lado = {titulo?: string; itens?: unknown; tom?: 'bom' | 'ruim' | 'neutro'};

// Dois lados lado a lado: antes/depois, pode/não pode, mito/verdade.
// props: { esquerda: {titulo, itens, tom}, direita: {titulo, itens, tom}, emDireita? }
export const Comparacao: CenaComponente = (p) => {
  const {entrada, saida, emFrame} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const lados: [Lado, number][] = [
    [p.props.esquerda ?? {}, 0],
    [p.props.direita ?? {}, emFrame(p.props.emDireita, Math.round(p.duracao * 0.35))],
  ];

  return (
    <Centro style={{opacity: saida, flexDirection: 'row', alignItems: 'center', gap: 3 * u, padding: 6 * u}}>
      {lados.map(([lado, atraso], k) => {
        const s = entrada(atraso);
        const cor = lado.tom === 'bom' ? MARCA.bom : lado.tom === 'ruim' ? MARCA.ruim : tema.destaque;
        const icone = lado.tom === 'bom' ? '✓' : lado.tom === 'ruim' ? '✕' : '•';
        return (
          <div
            key={k}
            style={{
              flex: 1,
              alignSelf: 'center',
              minHeight: 30 * u,
              background: tema.superficie,
              border: `${0.3 * u}px solid ${cor}`,
              borderRadius: 3 * u,
              padding: 4 * u,
              display: 'flex',
              flexDirection: 'column',
              gap: 2 * u,
              opacity: interpolate(s, [0, 0.5], [0, 1], clamp),
              transform: `translateY(${(1 - s) * 8 * u}px)`,
            }}
          >
            <div style={{fontFamily: FONTES.titulo, fontWeight: 800, fontSize: 5.4 * u, color: cor}}>{lado.titulo}</div>
            {itens(lado.itens).map((it, i) => (
              <div key={i} style={{display: 'flex', gap: 1.6 * u, opacity: entrada(atraso + 6 + i * 4)}}>
                <span style={{color: cor, fontFamily: FONTES.titulo, fontWeight: 800, fontSize: 4.2 * u}}>{icone}</span>
                <Texto tamanho={4.2}>{it.texto}</Texto>
              </div>
            ))}
          </div>
        );
      })}
    </Centro>
  );
};
