import type {CenaComponente} from './base';
import {CartaoTitulo} from './CartaoTitulo';
import {CitacaoLei} from './CitacaoLei';
import {Comparacao} from './Comparacao';
import {Contador} from './Contador';
import {CTA} from './CTA';
import {CUSTOM} from './custom';
import {Destaque} from './Destaque';
import {LinhaDoTempo} from './LinhaDoTempo';
import {Lista} from './Lista';
import {Passos} from './Passos';
import {Pergunta} from './Pergunta';

export const CENAS: Record<string, CenaComponente> = {
  Destaque,
  CartaoTitulo,
  Lista,
  Passos,
  Contador,
  CitacaoLei,
  Comparacao,
  Pergunta,
  LinhaDoTempo,
  CTA,
  ...CUSTOM,
};
