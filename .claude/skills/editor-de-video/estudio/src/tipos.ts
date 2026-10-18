// Tipos compartilhados entre o plano (plano.resolvido.json) e os componentes.
// Todos os tempos estão em SEGUNDOS na timeline do vídeo já cortado (editado.mp4).

export type Palavra = {
  t: string; // texto exibido (com pontuação quando disponível)
  i: number; // início (s)
  f: number; // fim (s)
};

export type Ponto = {x: number; y: number}; // coordenadas normalizadas 0..1

export type Layout = 'overlay' | 'split' | 'cheia';
export type Posicao = 'topo' | 'centro' | 'baixo';

export type Cena = {
  id: string;
  tipo: string; // nome de um template em cenas/index.ts
  inicio: number;
  fim: number;
  layout?: Layout;
  posicao?: Posicao; // só para layout overlay
  sfx?: string | null; // nome de arquivo em public/sfx sem extensão
  gatilho?: string;
  props?: Record<string, unknown>;
};

export type Zoom = {
  inicio: number;
  fim: number;
  escala: number; // 1.0 = sem zoom
  foco?: Ponto;
  tipo?: 'suave' | 'punch';
};

export type Sfx = {em: number; som: string; volume?: number};

export type Trilha = {
  arquivo: string; // caminho relativo a public/ (ex.: "musica/trilha-ambiente.mp3")
  volume?: number; // volume sem fala
  volumeComFala?: number; // volume durante a fala (ducking)
  fadeIn?: number;
  fadeOut?: number;
};

export type Legendas = {
  ativo?: boolean;
  palavrasPorBloco?: number;
  destaques?: string[]; // palavras que ficam sempre na cor de destaque
  maiusculas?: boolean;
};

export type Plano = {
  titulo?: string;
  tema?: 'escuro' | 'claro';
  layoutPadrao?: Layout;
  proporcaoSplit?: number; // fração da tela ocupada pelo painel no split (padrão 0.5)
  foco?: Ponto; // onde está o rosto no vídeo original
  legendas?: Legendas;
  cenas: Cena[];
  zooms?: Zoom[];
  sfx?: Sfx[];
  sfxVolume?: number;
  trilha?: Trilha | null;
  extraFinal?: number; // segundos de encerramento depois do fim da gravação (ex.: CTA em tela cheia)
};

export type VideoProps = {
  video: string | null; // relativo a public/ (ex.: "atual/editado.mp4"); null = placeholder
  duracao: number; // duração do vídeo gravado (editado), sem o extraFinal
  fps: number;
  palavras: Palavra[];
  plano: Plano;
};
