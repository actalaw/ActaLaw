import React from 'react';
import {Easing, interpolate} from 'remotion';
import {FONTES, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';
import {CenaComponente, Centro, Texto, useCena} from './base';

// Número que conta até o valor (estatística, prazo, pena, multa).
// props: { ate, de?=0, prefixo?, sufixo?, rotulo?, decimais?=0, em? }
export const Contador: CenaComponente = (p) => {
  const {frame, fps, entrada, suave, saida, emFrame} = useCena(p);
  const {u} = useCaixa();
  const tema = useTema();
  const {ate = 100, de = 0, prefixo = '', sufixo = '', rotulo, decimais = 0} = p.props;
  const inicioConta = emFrame(p.props.em, 4);
  const progresso = interpolate(frame, [inicioConta, inicioConta + Math.round(fps * 1.2)], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const valor = Number(de) + (Number(ate) - Number(de)) * progresso;
  const texto = valor.toLocaleString('pt-BR', {minimumFractionDigits: decimais, maximumFractionDigits: decimais});
  const s = entrada(0);

  return (
    <Centro style={{opacity: saida, gap: 2 * u}}>
      <div
        style={{
          fontFamily: FONTES.titulo,
          fontWeight: 800,
          fontSize: 20 * u,
          lineHeight: 1,
          color: tema.primaria,
          fontVariantNumeric: 'tabular-nums',
          transform: `scale(${0.7 + 0.3 * s})`,
          opacity: s,
        }}
      >
        <span style={{color: tema.destaque, fontSize: '0.55em'}}>{prefixo}</span>
        {texto}
        <span style={{color: tema.destaque, fontSize: '0.55em'}}>{sufixo}</span>
      </div>
      <div style={{width: 40 * u, height: 0.9 * u, borderRadius: u, background: tema.acentoSuave, overflow: 'hidden'}}>
        <div style={{width: `${progresso * 100}%`, height: '100%', background: tema.destaque}} />
      </div>
      {rotulo ? (
        <Texto tamanho={4.6} style={{opacity: suave(10), textAlign: 'center', color: tema.muted, maxWidth: 80 * u}}>
          {rotulo}
        </Texto>
      ) : null}
    </Centro>
  );
};
