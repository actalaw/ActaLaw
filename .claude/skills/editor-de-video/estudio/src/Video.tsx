import React, {useMemo} from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CENAS} from './cenas';
import {Efeitos, Trilha} from './componentes/Audio';
import {Camera} from './componentes/Camera';
import {Legendas} from './componentes/Legendas';
import {Caixa, CaixaContext, FONTES, TemaContext, TEMAS, useTema} from './tema';
import type {Cena, Layout, Posicao, VideoProps} from './tipos';
import {envelope, juntarIntervalos} from './util/tempo';

const FOCO_PADRAO = {x: 0.5, y: 0.38};

// Caixas do layout overlay (frações da tela).
const CAIXAS_OVERLAY: Record<Posicao, {top: number; h: number}> = {
  topo: {top: 0.07, h: 0.34},
  centro: {top: 0.3, h: 0.4},
  baixo: {top: 0.5, h: 0.3},
};

const Placeholder: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'linear-gradient(160deg, #3b4252 0%, #1f2430 100%)',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.35)',
      fontFamily: FONTES.ui,
      fontSize: 48,
      fontWeight: 600,
    }}
  >
    <div style={{fontSize: 220}}>🧑‍⚖️</div>
    VÍDEO GRAVADO
  </AbsoluteFill>
);

// Moldura das cenas em overlay: cartão sobre o vídeo, com entrada/saída próprias.
const MolduraOverlay: React.FC<{duracao: number; children: React.ReactNode}> = ({duracao, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tema = useTema();
  const s = spring({frame, fps, config: {damping: 15, stiffness: 150}});
  const out = spring({frame: frame - (duracao - 10), fps, config: {damping: 200}});
  const v = s * (1 - out);
  return (
    <AbsoluteFill
      style={{
        background: tema.superficie,
        border: `2px solid ${tema.borda}`,
        borderRadius: 36,
        boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        opacity: v,
        transform: `translateY(${(1 - v) * 40}px) scale(${0.94 + 0.06 * v})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const CenaRenderizada: React.FC<{cena: Cena; fps: number; caixa: Caixa}> = ({cena, fps, caixa}) => {
  const Componente = CENAS[cena.tipo];
  const duracao = Math.max(1, Math.round((cena.fim - cena.inicio) * fps));
  const conteudo = Componente ? (
    <Componente props={cena.props ?? {}} inicio={cena.inicio} fim={cena.fim} duracao={duracao} />
  ) : (
    <AbsoluteFill style={{background: '#7f1d1d', color: '#fff', fontSize: 40, alignItems: 'center', justifyContent: 'center'}}>
      Cena desconhecida: {cena.tipo}
    </AbsoluteFill>
  );
  return (
    <Sequence from={Math.round(cena.inicio * fps)} durationInFrames={duracao} name={`${cena.id} · ${cena.tipo}`}>
      <CaixaContext.Provider value={caixa}>
        {caixa.modo === 'overlay' ? <MolduraOverlay duracao={duracao}>{conteudo}</MolduraOverlay> : conteudo}
      </CaixaContext.Provider>
    </Sequence>
  );
};

const caixaDe = (w: number, h: number, modo: Caixa['modo']): Caixa => ({w, h, modo, u: Math.min(w, h * 1.1) / 100});

export const Video: React.FC<VideoProps> = ({video, duracao, fps, palavras, plano}) => {
  const frame = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const t = frame / fps;
  const tema = TEMAS[plano.tema ?? 'escuro'];
  const horizontal = W > H * 1.2;
  const proporcao = plano.proporcaoSplit ?? 0.5;
  const foco = plano.foco ?? FOCO_PADRAO;
  const layoutDe = (c: Cena): Layout => c.layout ?? plano.layoutPadrao ?? 'split';

  const intervalos = useMemo(() => {
    const de = (l: Layout) => plano.cenas.filter((c) => layoutDe(c) === l).map((c) => [c.inicio, c.fim] as [number, number]);
    return {split: juntarIntervalos(de('split'), 0.8), cheia: juntarIntervalos(de('cheia'), 0.4)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plano]);

  const splitAmt = Math.max(0, ...intervalos.split.map(([a, b]) => envelope(t, a, b, 0.35)));
  const cheiaAmt = Math.max(0, ...intervalos.cheia.map(([a, b]) => envelope(t, a, b, 0.25)));

  // Geometria do split: painel entra pelo topo (9:16, 1:1) ou pela esquerda (16:9).
  const painel = (horizontal ? W : H) * proporcao;
  const deslocamento = splitAmt * painel;
  const areaVideo: React.CSSProperties = horizontal
    ? {left: deslocamento, width: W - deslocamento}
    : {top: deslocamento, height: H - deslocamento};
  const areaPainel: React.CSSProperties = horizontal
    ? {left: -(1 - splitAmt) * painel, width: painel}
    : {top: -(1 - splitAmt) * painel, height: painel};

  const caixaSplit = horizontal ? caixaDe(painel, H, 'split') : caixaDe(W, painel, 'split');
  const caixaCheia = caixaDe(W, H, 'cheia');

  // Legendas: no split ficam na divisa (como no vídeo de referência); senão, no terço inferior.
  const tamanhoLegenda = (horizontal ? H * 0.065 : W * 0.064) * (W / H > 0.9 && !horizontal ? 0.85 : 1);
  const yBase = H * (horizontal ? 0.84 : W / H > 0.9 ? 0.8 : 0.7);
  const yCheia = H * (horizontal ? 0.88 : 0.86); // em tela cheia a legenda desce para não cobrir a cena
  const ySplit = horizontal ? yBase : yBase + (painel - yBase) * splitAmt;
  const yLegenda = ySplit + (yCheia - ySplit) * cheiaAmt;

  const cenasPor = (l: Layout) => plano.cenas.filter((c) => layoutDe(c) === l);

  return (
    <TemaContext.Provider value={tema}>
      <AbsoluteFill style={{background: '#000'}}>
        {/* Vídeo gravado (com zoom/reenquadramento) */}
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...areaVideo}}>
          <Camera t={t} zooms={plano.zooms ?? []} foco={foco}>
            {video ? (
              <Sequence durationInFrames={Math.max(1, Math.round(duracao * fps))} layout="none">
                <OffthreadVideo
                  src={staticFile(video)}
                  style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${foco.x * 100}% ${foco.y * 100}%`}}
                />
              </Sequence>
            ) : (
              <Placeholder />
            )}
          </Camera>
        </div>

        {/* Painel do split */}
        {splitAmt > 0 ? (
          <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: tema.fundo, ...areaPainel}}>
            <div
              style={{
                position: 'absolute',
                background: tema.destaque,
                boxShadow: `0 0 24px ${tema.destaque}`,
                ...(horizontal ? {right: 0, top: 0, bottom: 0, width: 4} : {left: 0, right: 0, bottom: 0, height: 4}),
              }}
            />
            {cenasPor('split').map((c) => (
              <CenaRenderizada key={c.id} cena={c} fps={fps} caixa={caixaSplit} />
            ))}
          </div>
        ) : null}

        {/* Cenas em overlay sobre o vídeo */}
        {cenasPor('overlay').map((c) => {
          const cx = CAIXAS_OVERLAY[c.posicao ?? 'topo'];
          const w = W * (horizontal ? 0.6 : 0.9);
          const h = H * cx.h;
          return (
            <div key={c.id} style={{position: 'absolute', left: (W - w) / 2, top: H * cx.top, width: w, height: h}}>
              <CenaRenderizada cena={c} fps={fps} caixa={caixaDe(w, h, 'overlay')} />
            </div>
          );
        })}

        {/* Tela cheia (cutaway) */}
        {cheiaAmt > 0 ? (
          <AbsoluteFill style={{background: tema.fundo, opacity: cheiaAmt, transform: `scale(${1.04 - 0.04 * cheiaAmt})`}}>
            {cenasPor('cheia').map((c) => (
              <CenaRenderizada key={c.id} cena={c} fps={fps} caixa={caixaCheia} />
            ))}
          </AbsoluteFill>
        ) : null}

        {/* Legendas */}
        {plano.legendas?.ativo !== false ? (
          <div
            style={{
              position: 'absolute',
              left: horizontal ? deslocamento : 0,
              right: 0,
              top: yLegenda,
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'center',
              padding: `0 ${W * 0.06}px`,
            }}
          >
            <Legendas t={t} fps={fps} palavras={palavras} config={plano.legendas ?? {}} tamanho={tamanhoLegenda} />
          </div>
        ) : null}

        {/* Áudio */}
        {plano.trilha ? <Trilha trilha={plano.trilha} palavras={palavras} duracao={duracao + (plano.extraFinal ?? 0)} fps={fps} /> : null}
        <Efeitos cenas={plano.cenas} avulsos={plano.sfx ?? []} volume={plano.sfxVolume ?? 0.6} fps={fps} />
      </AbsoluteFill>
    </TemaContext.Provider>
  );
};
