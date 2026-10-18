# plano.json: schema e catálogo de cenas

O plano mora em `videos/<slug>/plano.json`. `scripts/plano.mjs` resolve as palavras-gatilho em tempos e grava `plano.resolvido.json`, que é o arquivo que o render usa. **Nunca edite o resolvido**: edite o `plano.json`.

## Estrutura

```jsonc
{
  "titulo": "Habeas corpus em 60 segundos",
  "tema": "escuro",                 // "escuro" (padrão) | "claro"
  "layoutPadrao": "split",          // "split" | "overlay" | "cheia"
  "proporcaoSplit": 0.5,            // fração da tela do painel no split
  "formatos": ["9x16"],             // "9x16" | "1x1" | "16x9"
  "foco": {"x": 0.5, "y": 0.4},     // centro do rosto (de analise-visual.json)
  "legendas": {"ativo": true, "palavrasPorBloco": 3, "destaques": ["habeas", "corpus"], "maiusculas": true},
  "cenas": [ /* ver abaixo */ ],
  "zooms": [ /* ver abaixo */ ],
  "sfx": [{"gatilho": "atenção", "som": "riser"}],   // efeitos avulsos (além dos das cenas)
  "sfxVolume": 0.55,
  "trilha": {"arquivo": "musica/trilha-ambiente.mp3", "volume": 0.2, "volumeComFala": 0.06, "fadeIn": 1, "fadeOut": 1.5},
  "extraFinal": 2.5                 // segundos depois do fim da gravação (para um CTA em tela cheia)
}
```

## Cena

```jsonc
{
  "id": "requisitos",              // único; aparece no QA
  "tipo": "Lista",                 // template (catálogo abaixo) ou cena custom
  "gatilho": "três requisitos",    // frase falada onde a cena entra (≈0,12 s antes)
  "ate": "liberdade.",             // frase onde termina (+0,35 s) — ou "duracao": 3.5
  "ocorrencia": 2,                 // opcional: qual ocorrência do gatilho (padrão: a próxima depois da cena anterior)
  "antecipar": 0.12,               // opcional: segundos antes do gatilho
  "layout": "split",               // opcional (padrão: layoutPadrao)
  "posicao": "topo",               // só overlay: "topo" | "centro" | "baixo"
  "sfx": "whoosh",                 // opcional: whoosh | pop | thud | click | riser | ding
  "props": { /* do template */ }
}
```
Também aceita `"inicio"`/`"fim"` em segundos (timeline editada), mas prefira gatilhos. O casamento ignora maiúsculas, acentos e pontuação; a última palavra do gatilho pode ser prefixo ("constitu" casa com "Constituição").

**Tempos dentro das props:** qualquer chave `em` ou terminada em `Em` (`ateEm`, `revelarEm`, `emDireita`) aceita `"@frase"`, resolvida para a primeira ocorrência depois do início da cena. É assim que cada item de uma lista entra **no instante em que é falado**.

### Layouts
| layout | O que acontece | Quando usar |
|---|---|---|
| `split` | painel com a cena entra por cima (ou pela esquerda no 16:9) e o vídeo encolhe; a legenda fica na divisa | padrão; conteúdo com texto |
| `overlay` | cartão sobre o vídeo, que continua em tela cheia | reforço rápido, sem tirar o rosto |
| `cheia` | a cena cobre a tela toda (cutaway); o áudio segue | momento-chave, título de seção, CTA |

## Catálogo de templates

| tipo | props | Para quê |
|---|---|---|
| `Destaque` | `texto`, `sub?`, `emoji?` | palavra/frase de impacto, título de seção |
| `CartaoTitulo` | `rotulo?`, `titulo`, `detalhe?`, `valor?`, `etiqueta?`, `inclinacao?` | lei, processo, decisão, produto, prazo |
| `Lista` | `titulo?`, `itens: (texto \| {texto, em?, icone?})[]` | requisitos, direitos, documentos |
| `Passos` | `titulo?`, `itens: (texto \| {texto, em?})[]` | rito, procedimento, etapas (destaca o passo atual) |
| `Contador` | `ate`, `de?`, `prefixo?`, `sufixo?`, `rotulo?`, `decimais?`, `em?` | números: pena, multa, prazo, estatística |
| `CitacaoLei` | `texto` (literal!), `fonte`, `ateEm?` | artigo, súmula, ementa (revela palavra a palavra) |
| `Comparacao` | `esquerda {titulo, itens, tom}`, `direita {…}`, `emDireita?` | mito × verdade, antes × depois, pode × não pode (`tom`: bom \| ruim \| neutro) |
| `Pergunta` | `pergunta`, `opcoes[]`, `correta?` (índice), `revelarEm?` | quiz, enquete, gancho |
| `LinhaDoTempo` | `eventos: {data, texto, em?}[]` | histórico de um caso, tramitação, mudanças na lei |
| `CTA` | `texto?`, `handle?` (padrão @acta.law), `site?` | encerramento com a marca |

## Zoom

```jsonc
{"gatilho": "isso é crime", "ate": "crime.", "escala": 1.2, "tipo": "punch", "foco": {"x": 0.5, "y": 0.35}}
```
`suave` faz uma rampa de 0,4 s (ênfase); `punch` é um corte seco (jump zoom, ótimo para quebrar monotonia). Escala entre 1,1 e 1,3. Sem `ate`, usa `duracao` ou 1,6 s.

## Exemplo completo (trecho)

```json
{
  "tema": "escuro", "layoutPadrao": "split", "formatos": ["9x16"],
  "foco": {"x": 0.48, "y": 0.42},
  "legendas": {"palavrasPorBloco": 3, "destaques": ["habeas", "corpus", "liberdade"]},
  "cenas": [
    {"id": "titulo", "tipo": "Destaque", "gatilho": "habeas corpus", "duracao": 2.5, "sfx": "whoosh",
     "props": {"texto": "Habeas Corpus", "sub": "o remédio da liberdade", "emoji": "⚖️"}},
    {"id": "lei", "tipo": "CitacaoLei", "gatilho": "a Constituição diz", "ate": "locomoção.",
     "props": {"texto": "Conceder-se-á habeas corpus sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de locomoção, por ilegalidade ou abuso de poder;", "fonte": "Art. 5º, LXVIII — CF/88", "ateEm": "@locomoção"}},
    {"id": "quem", "tipo": "Comparacao", "gatilho": "muita gente acha", "ate": "qualquer pessoa.",
     "props": {"emDireita": "@na verdade",
       "esquerda": {"titulo": "Mito", "tom": "ruim", "itens": ["Só advogado impetra"]},
       "direita": {"titulo": "Verdade", "tom": "bom", "itens": ["Qualquer pessoa pode"]}}},
    {"id": "fim", "tipo": "CTA", "layout": "cheia", "gatilho": "segue", "duracao": 3, "sfx": "ding", "props": {}}
  ],
  "zooms": [{"gatilho": "isso é importante", "escala": 1.2, "tipo": "punch"}],
  "trilha": {"arquivo": "musica/trilha-ambiente.mp3"},
  "extraFinal": 2
}
```
