#!/usr/bin/env bash
# Prepara o editor de vídeo. Idempotente e rápido quando já está tudo pronto.
#   bash .claude/skills/editor-de-video/scripts/setup.sh
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
ok() { echo "✓ $*"; }
aviso() { echo "⚠ $*"; }
erro() { echo "✖ $*"; FALHOU=1; }
FALHOU=0

# Node 18+ e ffmpeg
if command -v node >/dev/null; then
  v=$(node -p 'process.versions.node.split(".")[0]')
  [ "$v" -ge 18 ] && ok "node $(node -v)" || erro "node $(node -v) — precisa de 18+"
else
  erro "node não encontrado"
fi
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null && ok "ffmpeg $(ffmpeg -version | head -1 | cut -d' ' -f3)" || erro "ffmpeg/ffprobe não encontrados"

# Dependências do estúdio Remotion
cd "$SKILL/estudio" || exit 1
if [ ! -d node_modules/remotion ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "• instalando dependências do estúdio (npm ci)…"
  npm ci --no-audit --no-fund --loglevel=error >/dev/null && ok "dependências instaladas" || erro "npm ci falhou"
else
  ok "dependências do estúdio já instaladas"
fi

# Efeitos sonoros e trilha provisória (gerados localmente)
node "$SKILL/scripts/gerar-sfx.mjs" >/dev/null && ok "efeitos sonoros prontos" || erro "falha ao gerar efeitos"

# Navegador para o render
if [ -n "${REMOTION_BROWSER:-}" ]; then
  ok "navegador: $REMOTION_BROWSER"
elif ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell >/dev/null 2>&1; then
  ok "navegador: Chromium headless do ambiente"
else
  aviso "nenhum Chromium local — o Remotion vai baixar o Chrome Headless Shell no primeiro render"
fi

# Groq (transcrição)
if [ -z "${GROQ_API_KEY:-}" ]; then
  aviso "GROQ_API_KEY não definida — adicione nas variáveis do ambiente (nuvem: menu do ambiente → Edit) ou use --srt"
else
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models || true)
  case "$code" in
    200) ok "Groq acessível e chave válida" ;;
    401) erro "GROQ_API_KEY inválida (401)" ;;
    000 | 403) aviso "api.groq.com bloqueado pela rede (HTTP $code) — libere o domínio em Network access do ambiente" ;;
    *) aviso "Groq respondeu HTTP $code" ;;
  esac
fi

exit $FALHOU
