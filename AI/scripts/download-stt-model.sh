#!/usr/bin/env bash
set -euo pipefail

#Download model STT dari Hugging Face.
MODEL_ID="${AI_STT_MODEL_ID:-oxide-lab/whisper-medium-GGUF}"
MODEL_FILE="${AI_STT_MODEL_FILE:-whisper-medium-q8_0.gguf}"
MODEL_DIR="${AI_STT_MODEL_DIR:-models/model_cache}"
TOKEN="${HF_TOKEN:-${HUGGINGFACE_TOKEN:-}}"

mkdir -p "$MODEL_DIR"

TARGET_PATH="$MODEL_DIR/$MODEL_FILE"
TEMP_PATH="$TARGET_PATH.tmp"
MODEL_URL="https://huggingface.co/$MODEL_ID/resolve/main/$MODEL_FILE"

if [[ -f "$TARGET_PATH" ]]; then
  echo "Model sudah ada: $TARGET_PATH"
  exit 0
fi

echo "Download model STT:"
echo "  repo: $MODEL_ID"
echo "  file: $MODEL_FILE"
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
