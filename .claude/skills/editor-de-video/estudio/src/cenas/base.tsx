import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONTES, useCaixa, useTema} from '../tema';
import {clamp} from '../util/tempo';

// Props que toda cena recebe. `props` vem livre do plano; cada template lê o que precisa.
export type CenaProps = {
  props: Record<string, any>;
  inicio: number; // s (timeline editada)
  fim: number; // s
  duracao: number; // frames
};

export type CenaComponente = React.FC<CenaProps>;

// Helper de animação comum a todas as cenas.
export const useCena = (p: CenaProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrada = (atraso = 0, config: {damping?: number; stiffness?: number; mass?: number} = {}) =>
    spring({frame: frame - atraso, fps, config: {damping: 16, stiffness: 140, mass: 0.7, ...config}});
  const suave = (atraso = 0) => spring({frame: frame - atraso, fps, config: {damping: 200}});
  const saida = interpolate(frame, [p.duracao - 9, p.duracao], [1, 0], clamp);
  // Converte um tempo absoluto (s) — ou "@palavra" já resolvido para número — em frame relativo à cena.
  const emFrame = (em: unknown, padrao: number) =>
    typeof em === 'number' ? Math.round((em - p.inicio) * fps) : padrao;
  return {frame, fps, entrada, suave, saida, emFrame};
};

// Distribui N itens ao longo da cena quando o plano não informa `em`.
export const atrasosPadrao = (n: number, duracao: number, inicio = 6) => {
  const janela = Math.max(n * 6, Math.round(duracao * 0.55));
  return Array.from({length: n}, (_, i) => inicio + Math.round((janela / Math.max(n, 1)) * i));
};

export const Centro: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Rotulo: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const {u} = useCaixa();
  const tema = useTema();
  return (
    <div
      style={{
        fontFamily: FONTES.ui,
        fontWeight: 600,
        fontSize: 3.4 * u,
        letterSpacing: 0.35 * u,
        textTransform: 'uppercase',
        color: tema.destaque,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Titulo: React.FC<{children: React.ReactNode; tamanho?: number; style?: React.CSSProperties}> = ({
  children,
  tamanho = 8,
  style,
}) => {
  const {u} = useCaixa();
  const tema = useTema();
  return (
    <div
      style={{
        fontFamily: FONTES.titulo,
        fontWeight: 800,
        fontSize: tamanho * u,
        lineHeight: 1.08,
        letterSpacing: -0.02 * tamanho * u,
        color: tema.primaria,
        textAlign: 'center',
        textWrap: 'balance',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Texto: React.FC<{children: React.ReactNode; tamanho?: number; style?: React.CSSProperties}> = ({
  children,
  tamanho = 4.6,
  style,
}) => {
  const {u} = useCaixa();
  const tema = useTema();
  return (
    <div
      style={{
        fontFamily: FONTES.ui,
        fontWeight: 500,
        fontSize: tamanho * u,
        lineHeight: 1.3,
        color: tema.texto,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Normaliza item de lista: aceita "texto" ou {texto, em, icone}.
export type Item = {texto: string; em?: number; icone?: string};
export const itens = (v: unknown): Item[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? {texto: x} : (x as Item))) : [];
