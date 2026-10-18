import {createContext, useContext} from 'react';

// Identidade visual do ActaLaw (ver CLAUDE.md na raiz do repositório).
export const MARCA = {
  navy: '#1a3a6b',
  sky: '#60a5fa',
  offWhite: '#f5f7fa',
  darkNavy: '#0a0f1e',
  white: '#ffffff',
  almostBlack: '#111827',
  gray: '#6b7280',
  lightBlue: '#dbeafe',
  bom: '#34d399',
  ruim: '#f87171',
};

export const FONTES = {
  titulo: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  ui: "'Outfit', 'Helvetica Neue', Arial, sans-serif",
};

export type Tema = {
  escuro: boolean;
  fundo: string; // fundo do painel (split/cheia)
  superficie: string; // cartões
  borda: string;
  texto: string;
  muted: string;
  primaria: string; // títulos
  destaque: string; // acentos, palavras-chave
  acentoSuave: string;
};

export const TEMAS: Record<'escuro' | 'claro', Tema> = {
  escuro: {
    escuro: true,
    fundo: `radial-gradient(120% 90% at 50% 0%, #13254a 0%, ${MARCA.darkNavy} 70%)`,
    superficie: 'rgba(17, 27, 51, 0.92)',
    borda: 'rgba(96, 165, 250, 0.28)',
    texto: '#f1f5f9',
    muted: '#94a3b8',
    primaria: '#ffffff',
    destaque: MARCA.sky,
    acentoSuave: 'rgba(96, 165, 250, 0.16)',
  },
  claro: {
    escuro: false,
    fundo: `linear-gradient(180deg, ${MARCA.offWhite} 0%, ${MARCA.lightBlue} 100%)`,
    superficie: 'rgba(255, 255, 255, 0.96)',
    borda: 'rgba(26, 58, 107, 0.14)',
    texto: MARCA.almostBlack,
    muted: MARCA.gray,
    primaria: MARCA.navy,
    destaque: '#2563eb',
    acentoSuave: MARCA.lightBlue,
  },
};

export const TemaContext = createContext<Tema>(TEMAS.escuro);
export const useTema = () => useContext(TemaContext);

// Tamanho da caixa onde a cena está sendo desenhada. As cenas usam `u`
// (1% do menor lado útil) para escalar igual em 9:16, 1:1 e 16:9.
export type Caixa = {w: number; h: number; u: number; modo: 'overlay' | 'split' | 'cheia'};
export const CaixaContext = createContext<Caixa>({w: 1080, h: 960, u: 9.6, modo: 'split'});
export const useCaixa = () => useContext(CaixaContext);
