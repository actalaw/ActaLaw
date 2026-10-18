import React from 'react';
import {interpolate} from 'remotion';
import {FONTES, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {atrasosPadrao, CenaComponente, Centro, itens, Rotulo, Texto, useCena} from './base';

// Lista cujos itens entram no momento em que são falados.
// props: { titulo?, itens: (string | {texto, em?: "@palavra"|segundos, icone?})[] }
export const Lista: CenaComponente = (p) => {
  const {entrada, suave, saida, emFrame} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const lista = itens(p.props.itens);
  const padrao = atrasosPadrao(lista.length, p.duracao, p.props.titulo ? 10 : 4);

  return (
    <Centro style={{opacity: saida, alignItems: 'stretch', padding: `${5 * u}px ${8 * u}px`, gap: 2.6 * u}}>
      {p.props.titulo ? <Rotulo style={{opacity: suave(0), textAlign: 'left'}}>{p.props.titulo}</Rotulo> : null}
      {lista.map((it, i) => {
        const s = entrada(emFrame(it.em, padrao[i]));
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3 * u,
              opacity: interpolate(s, [0, 0.5], [0, 1], clamp),
              transform: `translateX(${(1 - s) * -10 * u}px)`,
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 7.5 * u,
                height: 7.5 * u,
                borderRadius: '50%',
                background: tema.acentoSuave,
                border: `${0.4 * u}px solid ${tema.destaque}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTES.titulo,
                fontWeight: 800,
                fontSize: 3.6 * u,
                color: tema.destaque,
                transform: `scale(${s})`,
              }}
            >
              {it.icone ?? i + 1}
            </div>
            <Texto tamanho={5.8} style={{fontWeight: 600}}>
              {it.texto}
            </Texto>
          </div>
        );
      })}
    </Centro>
  );
};
