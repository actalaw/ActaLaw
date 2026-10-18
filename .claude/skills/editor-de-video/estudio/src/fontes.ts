// Fontes servidas localmente via @fontsource (licença OFL), sem depender de rede no render.
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import {continueRender, delayRender} from 'remotion';

const handle = delayRender('Carregando fontes');
Promise.all(
  [
    '600 20px Montserrat',
    '700 20px Montserrat',
    '800 20px Montserrat',
    '400 20px Outfit',
    '500 20px Outfit',
    '600 20px Outfit',
  ].map((f) => document.fonts.load(f)),
)
  .catch((err) => console.warn('Falha ao carregar fontes', err))
  .finally(() => continueRender(handle));
