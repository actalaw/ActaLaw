import React, {useMemo} from 'react';
import {Html5Audio, interpolate, Sequence, staticFile} from 'remotion';
import type {Cena, Palavra, Sfx, Trilha as ConfigTrilha} from '../tipos';
import {clamp} from '../util/tempo';

// Trilha de fundo com ducking automático: abaixa enquanto há fala.
export const Trilha: React.FC<{trilha: ConfigTrilha; palavras: Palavra[]; duracao: number; fps: number}> = ({
  trilha,
  palavras,
  duracao,
  fps,
}) => {
  const volumes = useMemo(() => {
    const n = Math.max(1, Math.round(duracao * fps));
    const falando = new Uint8Array(n);
    for (const w of palavras) {
      const a = Math.max(0, Math.floor((w.i - 0.2) * fps));
      const b = Math.min(n - 1, Math.ceil((w.f + 0.3) * fps));
      for (let k = a; k <= b; k++) falando[k] = 1;
    }
    const semFala = trilha.volume ?? 0.22;
    const comFala = trilha.volumeComFala ?? 0.07;
    const ataque = 1 - Math.exp(-1 / (0.12 * fps)); // abaixa rápido
    const soltura = 1 - Math.exp(-1 / (0.6 * fps)); // volta devagar
    const out = new Float32Array(n);
    let v = falando[0] ? comFala : semFala;
    for (let k = 0; k < n; k++) {
      const alvo = falando[k] ? comFala : semFala;
      v += (alvo - v) * (alvo < v ? ataque : soltura);
      const fadeIn = interpolate(k, [0, (trilha.fadeIn ?? 1) * fps], [0, 1], clamp);
      const fadeOut = interpolate(k, [n - (trilha.fadeOut ?? 1.5) * fps, n], [1, 0], clamp);
      out[k] = v * fadeIn * fadeOut;
    }
    return out;
  }, [trilha, palavras, duracao, fps]);

  return <Html5Audio src={staticFile(trilha.arquivo)} loop volume={(f) => volumes[Math.min(f, volumes.length - 1)] ?? 0} />;
};

// Efeitos sonoros: os de cada cena (campo sfx) + os avulsos do plano.
export const Efeitos: React.FC<{cenas: Cena[]; avulsos: Sfx[]; volume: number; fps: number}> = ({
  cenas,
  avulsos,
  volume,
  fps,
}) => {
  const lista: Sfx[] = [
    ...cenas.filter((c) => c.sfx).map((c) => ({em: Math.max(0, c.inicio - 0.05), som: c.sfx as string})),
    ...avulsos,
  ];
  return (
    <>
      {lista.map((s, k) => (
        <Sequence key={k} from={Math.round(s.em * fps)} durationInFrames={Math.round(fps * 3)} layout="none">
          <Html5Audio src={staticFile(`sfx/${s.som}.wav`)} volume={(s.volume ?? 1) * volume} />
        </Sequence>
      ))}
    </>
  );
};
