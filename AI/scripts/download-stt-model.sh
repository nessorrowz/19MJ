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

MODEL_ID="${AI_STT_MODEL_ID:-oxide-lab/whisper-medium-GGUF}"
MODEL_FILE="${AI_STT_MODEL_FILE:-whisper-medium-q4_0.gguf}"
MODEL_REPO_PATH="${AI_STT_MODEL_REPO_PATH:-whisper.cpp/$MODEL_FILE}"
MODEL_DIR="${AI_STT_MODEL_DIR:-models/model_cache}"
TOKEN="${HF_TOKEN:-${HUGGINGFACE_TOKEN:-}}"

mkdir -p "$MODEL_DIR"

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
