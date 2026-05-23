#!/usr/bin/env bash
set -euo pipefail

#Download model STT dari Hugging Face.
ENV_FILE="../BE/.env"

if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value; do
    key="${key#"${key%%[![:space:]]*}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    [[ -z "$key" || "$key" == \#* ]] && continue
    case "$key" in
      AI_STT_*|HF_TOKEN|HUGGINGFACE_TOKEN)
        export "$key=${value%$'\r'}"
        ;;
    esac
  done < "$ENV_FILE"
fi

ENGINE="${AI_STT_ENGINE:-faster-whisper}"
MODEL_ID="${AI_STT_MODEL_ID:-large-v3-turbo}"
MODEL_FILE="${AI_STT_MODEL_FILE:-$MODEL_ID}"
MODEL_REPO_PATH="${AI_STT_MODEL_REPO_PATH:-whisper.cpp/$MODEL_FILE}"
MODEL_DIR="${AI_STT_MODEL_DIR:-models/model_cache}"
TOKEN="${HF_TOKEN:-${HUGGINGFACE_TOKEN:-}}"
PYTHON_CMD="${PYTHON_CMD:-}"

if [[ -z "$PYTHON_CMD" ]]; then
  if [[ -x ".venv/Scripts/python.exe" ]]; then
    PYTHON_CMD=".venv/Scripts/python.exe"
  elif [[ -x ".venv/bin/python" ]]; then
    PYTHON_CMD=".venv/bin/python"
  elif command -v uv >/dev/null 2>&1; then
    PYTHON_CMD="uv run python"
  else
    PYTHON_CMD="python"
  fi
fi

mkdir -p "$MODEL_DIR"

if [[ "$ENGINE" == "faster-whisper" ]]; then
  echo "Download model STT faster-whisper:"
  echo "  model: $MODEL_ID"
  echo "  cache: $MODEL_DIR"

  export HF_TOKEN="$TOKEN"
  $PYTHON_CMD -c "import os, sys; from faster_whisper.utils import download_model; download_model(sys.argv[1], output_dir=sys.argv[2], use_auth_token=os.getenv('HF_TOKEN') or None)" "$MODEL_ID" "$MODEL_DIR"
  echo "Download selesai: $MODEL_DIR"
  exit 0
fi

TARGET_PATH="$MODEL_DIR/$MODEL_FILE"
TEMP_PATH="$TARGET_PATH.tmp"
MODEL_URL="https://huggingface.co/$MODEL_ID/resolve/main/$MODEL_REPO_PATH"

if [[ -f "$TARGET_PATH" ]]; then
  echo "Model sudah ada: $TARGET_PATH"
  exit 0
fi

echo "Download model STT:"
echo "  repo: $MODEL_ID"
echo "  file: $MODEL_REPO_PATH"
echo "  target: $TARGET_PATH"

if [[ -n "$TOKEN" ]]; then
  curl --fail --location --continue-at - \
    --header "Authorization: Bearer $TOKEN" \
    --output "$TEMP_PATH" \
    "$MODEL_URL"
else
  curl --fail --location --continue-at - \
    --output "$TEMP_PATH" \
    "$MODEL_URL"
fi

mv "$TEMP_PATH" "$TARGET_PATH"
echo "Download selesai: $TARGET_PATH"
