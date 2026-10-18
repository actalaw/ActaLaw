// Props de demonstração para a composição "Galeria": mostra todos os templates
// sem precisar de um vídeo real. Usada no QA visual da biblioteca de cenas.
import type {Palavra, VideoProps} from './tipos';

const FRASE =
  'Você sabia que o habeas corpus protege a sua liberdade de locomoção? Vou te explicar em três passos simples, com base na Constituição.';

const palavrasDemo = (inicio: number, passo: number): Palavra[] =>
  FRASE.split(' ').map((t, k) => ({t, i: inicio + k * passo, f: inicio + k * passo + passo * 0.85}));

const D = 3.2; // duração de cada cena na galeria
const cena = (k: number) => ({inicio: 0.4 + k * (D + 0.5), fim: 0.4 + k * (D + 0.5) + D});

export const PROPS_GALERIA: VideoProps = {
  video: null,
  fps: 30,
  duracao: 0.4 + 11 * (D + 0.5) + 1,
  palavras: palavrasDemo(0.5, 0.42),
  plano: {
    titulo: 'Galeria de templates',
    tema: 'escuro',
    layoutPadrao: 'split',
    legendas: {ativo: true, palavrasPorBloco: 3, destaques: ['habeas', 'corpus', 'Constituição']},
    cenas: [
      {id: 'g1', tipo: 'Destaque', ...cena(0), sfx: 'whoosh', props: {texto: 'Habeas Corpus', sub: 'o remédio da liberdade', emoji: '⚖️'}},
      {id: 'g2', tipo: 'CartaoTitulo', ...cena(1), sfx: 'pop', props: {rotulo: 'STF · Plenário', titulo: 'Tema 506', detalhe: 'Porte para uso pessoal', valor: '8 × 3', etiqueta: 'Decidido'}},
      {id: 'g3', tipo: 'Lista', ...cena(2), props: {titulo: 'Requisitos', itens: ['Constrangimento ilegal', 'Liberdade de locomoção', 'Pedido de qualquer pessoa']}},
      {id: 'g4', tipo: 'Passos', ...cena(3), props: {titulo: 'Rito', itens: ['Impetração', 'Liminar', 'Julgamento']}},
      {id: 'g5', tipo: 'Contador', ...cena(4), sfx: 'riser', props: {ate: 40, sufixo: ' g', rotulo: 'limite para presumir uso pessoal'}},
      {id: 'g6', tipo: 'CitacaoLei', ...cena(5), props: {texto: 'Conceder-se-á habeas corpus sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de locomoção.', fonte: 'Art. 5º, LXVIII — CF/88'}},
      {id: 'g7', tipo: 'Comparacao', ...cena(6), props: {esquerda: {titulo: 'Mito', tom: 'ruim', itens: ['Só advogado pode impetrar']}, direita: {titulo: 'Verdade', tom: 'bom', itens: ['Qualquer pessoa pode']}}},
      {id: 'g8', tipo: 'Pergunta', ...cena(7), sfx: 'click', props: {pergunta: 'Quem pode impetrar HC?', opcoes: ['Só advogados', 'Qualquer pessoa', 'Só o MP'], correta: 1}},
      {id: 'g9', tipo: 'LinhaDoTempo', ...cena(8), props: {eventos: [{data: '1832', texto: 'Código de Processo Criminal'}, {data: '1891', texto: 'Constituição republicana'}, {data: '1988', texto: 'Art. 5º, LXVIII'}]}},
      {id: 'g10', tipo: 'Destaque', ...cena(9), layout: 'overlay', posicao: 'topo', props: {texto: 'Modo overlay', emoji: '🪟'}},
      {id: 'g11', tipo: 'CTA', ...cena(10), layout: 'cheia', sfx: 'ding', props: {site: 'actalaw.com.br'}},
    ],
    zooms: [{inicio: 34, fim: 37, escala: 1.25, tipo: 'punch'}],
    sfxVolume: 0.6,
    trilha: null,
  },
};
