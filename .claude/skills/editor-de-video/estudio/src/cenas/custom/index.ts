// Cenas sob medida escritas para um vídeo específico, quando nenhum template serve.
// Cada arquivo exporta um CenaComponente (ver ../base.tsx); registre-o aqui com o
// nome usado em "tipo" no plano.json. Ex.:
//   import {FilaDePedidos} from './FilaDePedidos';
//   export const CUSTOM = {FilaDePedidos};
import type {CenaComponente} from '../base';

export const CUSTOM: Record<string, CenaComponente> = {};
