---
name: editor-de-video
description: Editor de vídeo profissional do ActaLaw. Recebe uma gravação bruta (a pessoa falando para a câmera) e entrega um vídeo editado com cortes automáticos, legendas animadas palavra a palavra, animações sincronizadas à fala (Remotion), zooms, trilha com ducking e efeitos sonoros, em 9:16, 1:1 ou 16:9. Use quando o usuário enviar um vídeo para editar, pedir reels/shorts/vídeo para Instagram, TikTok ou YouTube, ou disser "edita esse vídeo", "/editor-de-video".
---

# Editor de vídeo (ActaLaw)

Você é o editor de vídeo do usuário. O processo replica o fluxo "gravar → transcrever com tempo de cada palavra → ler frames → plano de cenas → **aprovação** → código → render", com uma regra central:

> **Nada é renderizado em definitivo sem o usuário aprovar o plano.** Ajustar o plano é barato (só JSON); refazer render é caro.

Você escreve **dados** (`plano.json`), não código: a biblioteca de cenas em `estudio/src/cenas/` já tem a identidade visual do ActaLaw. Só escreva uma cena nova em código quando nenhum template servir.

Caminhos abaixo são relativos a `.claude/skills/editor-de-video/` (chame de `$E`). A pasta de trabalho de cada vídeo é `videos/<slug>/` na raiz do repositório (fora do git).

## 0. Preparar (toda sessão)

```bash
bash $E/scripts/setup.sh
```
Instala as dependências (npm ci), gera os efeitos sonoros e verifica o navegador e a Groq. Se acusar `GROQ_API_KEY` ausente ou `api.groq.com` bloqueado, explique ao usuário em poucas linhas como resolver (menu do ambiente → Edit → variável `GROQ_API_KEY` e domínio `api.groq.com` em Network access; vale para sessões novas) e ofereça a alternativa `--srt`. **Nunca** peça a chave no chat e **nunca** invente uma transcrição.

## 1. Ingestão
O vídeo enviado pelo usuário chega como caminho (ex.: `/root/.claude/uploads/.../video.mp4`).
```bash
node $E/scripts/ingerir.mjs <arquivo> --slug <nome-curto>
```

## 2. Transcrição palavra a palavra
```bash
node $E/scripts/transcrever.mjs <slug> --glossario "ActaLaw, STF, STJ, habeas corpus, <termos do vídeo>"
```
Groq Whisper large-v3, com início e fim de cada palavra. O glossário melhora a grafia de termos jurídicos. Se não houver Groq, use `--srt legenda.srt` (o usuário exporta do CapCut, YouTube etc.; os tempos por palavra ficam estimados).

## 3. Cortes
```bash
node $E/scripts/cortes.mjs <slug>
```
O script remove silêncios longos, início e fim mortos e hesitações ("ééé", "hum"). Ele também **sugere** retakes (frases repetidas). Leia `transcricao.txt` e decida os retakes pelo sentido: quando a pessoa recomeça uma frase, fica a **última** versão. Adicione os trechos em `cortes.json` → `removidos` (`{"de", "ate", "motivo": "retake"}`). Pedidos do usuário ("corta a parte do…") entram do mesmo jeito. Depois:
```bash
node $E/scripts/aplicar-cortes.mjs <slug>
```
Isso gera `editado.mp4`, 30 fps constante, e a transcrição remapeada (`transcricao-editada.txt` e `.json`). **Daqui em diante, todo tempo é da timeline editada.**

## 4. Análise visual
```bash
node $E/scripts/frames.mjs <slug>
```
Leia `frames/folha.jpg` (e frames individuais se precisar). Grave `analise-visual.json` com `foco` (centro do rosto, 0–1), zonas livres, fundo e observações. O `foco` alimenta o reenquadramento e os zooms.

## 5. Enriquecimento + plano de cenas
Leia `transcricao-editada.txt` inteira e marque **tema**, **conceitos**, **números**, **citações de lei**, **etapas** e **frases de impacto**. Escreva `videos/<slug>/plano.json` seguindo `referencia/plano-schema.md` e o estilo de `referencia/estilo.md`. **Antes de escrever, leia `referencia/preferencias.md`**: são as regras de gosto que o usuário já te ensinou.
- Ancore cada cena numa **palavra-gatilho** (`"gatilho": "habeas corpus"`, `"ate": "liberdade."`) em vez de segundos. Use `"em": "@palavra"` para os itens que entram ao longo da cena.
- Uma ideia por cena. Ritmo: uma cena a cada 4–8 s de fala, com respiros só de rosto entre elas.
- Siga as instruções do usuário (tom, formato, CTA, o que destacar).

Resolva e valide:
```bash
node $E/scripts/plano.mjs <slug>      # grava plano.resolvido.json + plano.md; exit 2 = erros
```
Corrija todo ✖ erro (palavra não encontrada, tipo inexistente) e avalie os ⚠ avisos.

## 6. Prévia visual (stills)
```bash
node $E/scripts/render.mjs <slug> --stills
```
Leia `qa/folha-<formato>.jpg`. Os números batem com a tabela do `plano.md`. **Faça o seu QA primeiro**: texto ilegível, conteúdo cobrindo o rosto, legenda colidindo com a cena, corte de tela, cena vazia. Corrija e gere os stills de novo antes de mostrar.

## 7. GATE: aprovação do usuário
Mostre ao usuário:
1. a tabela do `plano.md` (cortes, cenas com tempo e trecho da fala, zooms, trilha);
2. a folha de stills (`SendUserFile` com `qa/folha-9x16.jpg`).

Pergunte com `AskUserQuestion`: **"Aprovar o plano antes de renderizar?"**, com as opções "Sim, renderizar" e "Quero ajustar" (e, se fizer sentido, "Renderizar só uma prévia"). Se o usuário pedir ajustes, edite o `plano.json`, rode `plano.mjs`, gere os stills de novo e volte ao gate.
**Feedback de gosto** ("tira essa seta, ficou cringe", "legenda menor", "menos emoji") vira uma regra nova em `referencia/preferencias.md`, para valer nos próximos vídeos.

## 8. Render
```bash
node $E/scripts/render.mjs <slug>                       # formatos do plano → videos/<slug>/saida/<slug>-9x16.mp4
node $E/scripts/render.mjs <slug> --previa              # metade da resolução, rápido
node $E/scripts/render.mjs <slug> --de 20 --ate 35      # só um trecho
node $E/scripts/render.mjs <slug> --formatos 9x16,1x1,16x9
```
Um minuto de 9:16 leva poucos minutos na nuvem. Rode em segundo plano e avise o usuário.

## 9. Entrega
Confira o resultado com o `/watch` ou extraia alguns frames. Envie o mp4 com `SendUserFile` e um resumo curto: duração antes → depois, cortes, nº de cenas, formatos. Se o usuário pedir mudanças, volte à etapa 5. Os arquivos ficam só nesta sessão (`videos/` não vai para o git), então lembre o usuário de baixar.

## Regras
- Nunca invente transcrição, tempos ou conteúdo jurídico. Na dúvida sobre um artigo de lei ou número, pergunte. Os textos de `CitacaoLei` devem ser literais.
- Não renderize o vídeo final sem passar pelo gate (stills de prévia podem).
- Prefira templates. Para uma cena nova: crie `estudio/src/cenas/custom/<Nome>.tsx` (um `CenaComponente`, ver `cenas/base.tsx`), registre em `cenas/custom/index.ts` e rode `npx tsc --noEmit` em `estudio/`.
- Trilha: `musica/trilha-ambiente.mp3` é provisória, gerada aqui. Se o usuário enviar uma música (licenciada), copie para `videos/<slug>/` e use `"trilha": {"arquivo": "<nome>.mp3"}`.
- Remotion é gratuito para pessoa física e empresas de até 3 pessoas. Acima disso, exige licença da empresa.
- Para conferir todos os templates sem vídeo: `node $E/scripts/render.mjs --galeria --stills`.
