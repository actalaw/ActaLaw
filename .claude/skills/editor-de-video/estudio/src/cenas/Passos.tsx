import React from 'react';
import {interpolate} from 'remotion';
import {FONTES, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {atrasosPadrao, CenaComponente, Centro, itens, Rotulo, Texto, useCena} from './base';

// Fluxo de etapas conectadas (processo, rito, prazo). O passo mais recente fica em destaque.
// props: { titulo?, itens: (string | {texto, em?})[] }
export const Passos: CenaComponente = (p) => {
  const {frame, entrada, suave, saida, emFrame} = useCena(p);
  const {u, w, h} = useCaixa();
  const tema = useTema();
  const lista = itens(p.props.itens);
  const padrao = atrasosPadrao(lista.length, p.duracao, p.props.titulo ? 10 : 4);
  const atrasos = lista.map((it, i) => emFrame(it.em, padrao[i]));
  const horizontal = w / h > 1.05 && lista.length <= 4;
  const ativo = atrasos.reduce((acc, a, i) => (frame >= a ? i : acc), -1);

  return (
    <Centro style={{opacity: saida, padding: 6 * u, gap: 4 * u}}>
      {p.props.titulo ? <Rotulo style={{opacity: suave(0)}}>{p.props.titulo}</Rotulo> : null}
      <div
        style={{
          display: 'flex',
          flexDirection: horizontal ? 'row' : 'column',
          alignItems: horizontal ? 'flex-start' : 'stretch',
          gap: horizontal ? 2 * u : 2.4 * u,
          width: '100%',
          justifyContent: 'center',
        }}
      >
        {lista.map((it, i) => {
          const s = entrada(atrasos[i]);
          const destaque = i === ativo;
          const linha = i < lista.length - 1 ? interpolate(frame, [atrasos[i + 1] - 8, atrasos[i + 1]], [0, 1], clamp) : 0;
          return (
            <div
              key={i}
              style={{
                flex: horizontal ? 1 : undefined,
                display: 'flex',
                flexDirection: horizontal ? 'column' : 'row',
                alignItems: 'center',
                gap: 2.4 * u,
                position: 'relative',
                opacity: interpolate(s, [0, 0.5], [0, 1], clamp),
                transform: `scale(${0.8 + 0.2 * s})`,
              }}
            >
              <div
                style={{
                  flex: 'none',
                  width: 10 * u,
                  height: 10 * u,
                  borderRadius: '50%',
                  background: destaque ? tema.destaque : tema.acentoSuave,
                  color: destaque ? '#0a0f1e' : tema.destaque,
                  border: `${0.4 * u}px solid ${tema.destaque}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FONTES.titulo,
                  fontWeight: 800,
                  fontSize: 4.6 * u,
                  boxShadow: destaque ? `0 0 ${4 * u}px ${tema.destaque}` : 'none',
                  zIndex: 1,
                }}
              >
                {i + 1}
              </div>
              {i < lista.length - 1 ? (
                <div
                  style={{
                    position: 'absolute',
                    background: tema.destaque,
                    opacity: 0.6,
                    ...(horizontal
                      ? {top: 5 * u, left: '50%', height: 0.5 * u, width: `calc(${linha * 100}% + ${2 * u * linha}px)`}
                      : {left: 5 * u - 0.25 * u, top: 10 * u, width: 0.5 * u, height: 2.4 * u * linha}),
                  }}
                />
              ) : null}
              <Texto
                tamanho={horizontal ? 4 : 5}
                style={{
                  textAlign: horizontal ? 'center' : 'left',
                  fontWeight: destaque ? 700 : 500,
                  opacity: destaque || ativo < 0 ? 1 : 0.7,
                }}
              >
                {it.texto}
              </Texto>
            </div>
          );
        })}
      </div>
    </Centro>
  );
};
