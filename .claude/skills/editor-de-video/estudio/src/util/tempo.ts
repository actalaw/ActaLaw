import {Easing, interpolate} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const seg = (s: number, fps: number) => Math.round(s * fps);

// Envelope 0→1→0 para um intervalo [inicio, fim] em segundos, com rampas suaves.
export const envelope = (
  t: number,
  inicio: number,
  fim: number,
  rampaEntrada: number,
  rampaSaida = rampaEntrada,
) => {
  if (t <= inicio - rampaEntrada || t >= fim + rampaSaida) return 0;
  const ease = Easing.bezier(0.45, 0, 0.2, 1);
  const entrada = interpolate(t, [inicio - rampaEntrada, inicio], [0, 1], {...clamp, easing: ease});
  const saida = interpolate(t, [fim, fim + rampaSaida], [1, 0], {...clamp, easing: ease});
  return Math.min(entrada, saida);
};

// Junta intervalos que estão a menos de `folga` segundos um do outro.
export const juntarIntervalos = (intervalos: [number, number][], folga: number) => {
  const ord = [...intervalos].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [a, b] of ord) {
    const ult = out[out.length - 1];
    if (ult && a - ult[1] <= folga) ult[1] = Math.max(ult[1], b);
    else out.push([a, b]);
  }
  return out;
};

export const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
