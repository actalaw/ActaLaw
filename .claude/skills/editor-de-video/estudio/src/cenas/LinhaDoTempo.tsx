import React from 'react';
import {interpolate} from 'remotion';
import {FONTES, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {atrasosPadrao, CenaComponente, Centro, Texto, useCena} from './base';

type Evento = {data: string; texto: string; em?: number};

// Linha do tempo vertical (histórico de um caso, tramitação, mudanças na lei).
// props: { eventos: {data, texto, em?}[] }
export const LinhaDoTempo: CenaComponente = (p) => {
  const {frame, entrada, saida, emFrame} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const eventos: Evento[] = Array.isArray(p.props.eventos) ? p.props.eventos : [];
  const padrao = atrasosPadrao(eventos.length, p.duracao);
  const atrasos = eventos.map((e, i) => emFrame(e.em, padrao[i]));
  const ultimo = atrasos[atrasos.length - 1] ?? 0;
  const progresso = interpolate(frame, [atrasos[0] ?? 0, ultimo + 6], [0, 1], clamp);

  return (
    <Centro style={{opacity: saida, alignItems: 'stretch', padding: `${5 * u}px ${10 * u}px`}}>
      <div style={{position: 'relative', display: 'flex', flexDirection: 'column', gap: 3.4 * u}}>
        <div style={{position: 'absolute', left: 2.2 * u, top: 2 * u, bottom: 2 * u, width: 0.5 * u, background: tema.acentoSuave}}>
          <div style={{width: '100%', height: `${progresso * 100}%`, background: tema.destaque}} />
        </div>
        {eventos.map((e, i) => {
          const s = entrada(atrasos[i]);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 4 * u, opacity: interpolate(s, [0, 0.5], [0, 1], clamp)}}>
              <div
                style={{
                  flex: 'none',
                  width: 5 * u,
                  height: 5 * u,
                  borderRadius: '50%',
                  background: tema.destaque,
                  transform: `scale(${s})`,
                  boxShadow: `0 0 0 ${u}px ${tema.acentoSuave}`,
                  zIndex: 1,
                }}
              />
              <div style={{transform: `translateX(${(1 - s) * 6 * u}px)`}}>
                <div style={{fontFamily: FONTES.titulo, fontWeight: 800, fontSize: 5 * u, color: tema.destaque}}>{e.data}</div>
                <Texto tamanho={5}>{e.texto}</Texto>
              </div>
            </div>
          );
        })}
      </div>
    </Centro>
  );
};
