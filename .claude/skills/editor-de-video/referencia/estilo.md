# Estilo de edição ActaLaw

**Tom:** autoridade sem arrogância. O visual é premium, moderno e minimalista: o direito explicado para todos. Nada carregado ou amador.

## Marca
- Cores: Navy `#1a3a6b`, Sky `#60a5fa`, Dark Navy `#0a0f1e`, Off-White `#f5f7fa`, Light Blue `#dbeafe` (tokens em `estudio/src/tema.ts`).
- Fontes: Montserrat 700/800 (títulos, legendas), Outfit 500/600 (rótulos, texto).
- Tema `escuro` é o padrão para reels. Use `claro` para conteúdo educativo mais "limpo", se o usuário pedir.
- Handle: `@acta.law` · site: `actalaw.com.br`.

## Ritmo
- **Gancho nos 3 primeiros segundos:** uma cena `Destaque` ou `Pergunta` com o tema, e zoom punch na primeira frase forte.
- Uma cena a cada 4–8 s de fala. Entre cenas, deixe 1–3 s só de rosto (respiro).
- Cada cena fica na tela pelo menos 1,5 s. Se o texto for longo, a duração acompanha o tempo de leitura (cerca de 3 palavras/s).
- Zooms: 1 a cada 10–15 s, em frases de ênfase. Alterne `punch` e `suave`.
- SFX com parcimônia: `whoosh` em transição de seção, `pop` em cartões, `riser` antes de um número, `ding` no acerto/CTA, `thud` em afirmação forte. No máximo 1 SFX a cada ~5 s.
- Trilha sempre baixa (padrão 0,2 sem fala / 0,06 com fala).

## Conteúdo das cenas
- Texto curto: no máximo ~8 palavras por linha de lista e títulos de até 5 palavras.
- Itens de lista e passos entram **quando são falados** (`"em": "@palavra"`).
- Citações de lei: texto **literal** e fonte completa (artigo, inciso, diploma). Na dúvida, pergunte.
- Emojis: no máximo 1 por cena, sóbrio (⚖️ 📜 🏛️ 🔒 ⏳ ✅ ❌ 🚦 💡). Evite emojis infantis.
- Legendas: 3 palavras por bloco, maiúsculas. Em `destaques`, coloque 3–6 termos-chave do vídeo.

## Layout
- 9:16 (reels): `split` como padrão; `cheia` para título de seção e CTA; `overlay` para reforços curtos.
- Não cubra o rosto: no overlay, use `posicao` onde a análise visual indicou espaço livre.
- 16:9: o split fica lado a lado (painel à esquerda), e as cenas podem ter mais texto.
