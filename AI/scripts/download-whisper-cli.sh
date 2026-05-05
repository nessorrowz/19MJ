#!/usr/bin/env bash
set -euo pipefail

#Download prebuilt whisper.cpp CLI untuk Windows.
ENV_FILE="../BE/.env"

if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key value; do
    key="${key#"${key%%[![:space:]]*}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    [[ -z "$key" || "$key" == \#* ]] && continue
    case "$key" in
      AI_STT_*|GITHUB_TOKEN|WHISPER_CPP_REPO)
        export "$key=${value%$'\r'}"
        ;;
    esac
  done < "$ENV_FILE"
fi

REPO="${WHISPER_CPP_REPO:-ggml-org/whisper.cpp}"
INSTALL_DIR="${AI_STT_COMMAND_DIR:-tools/whisper.cpp}"
RELEASE_API="https://api.github.com/repos/$REPO/releases/latest"
TOKEN="${GITHUB_TOKEN:-}"

mkdir -p "$INSTALL_DIR"

if find "$INSTALL_DIR" -iname "whisper-cli.exe" -o -iname "main.exe" -o -iname "whisper.exe" | grep -q .; then
  FOUND_PATH="$(find "$INSTALL_DIR" -iname "whisper-cli.exe" | head -n 1)"
  if [[ -z "$FOUND_PATH" ]]; then
    FOUND_PATH="$(find "$INSTALL_DIR" -iname "main.exe" -o -iname "whisper.exe" | head -n 1)"
  fi
  echo "whisper.cpp CLI sudah ada: $FOUND_PATH"
  echo "export AI_STT_COMMAND_PATH=\"$PWD/$FOUND_PATH\""
  exit 0
fi

API_JSON="$INSTALL_DIR/latest-release.json"
ZIP_PATH="$INSTALL_DIR/whisper.cpp.zip"

echo "Ambil metadata release terbaru: $REPO"

if [[ -n "$TOKEN" ]]; then
  curl --fail --location --header "Authorization: Bearer $TOKEN" --output "$API_JSON" "$RELEASE_API"
else
  curl --fail --location --output "$API_JSON" "$RELEASE_API"
fi

ASSET_URL="$(uv run python - "$API_JSON" <<'PY'
import json
import re
import sys

release_path = sys.argv[1]
release = json.load(open(release_path, encoding="utf-8"))
assets = release.get("assets", [])

def score(asset):
    name = asset.get("name", "").lower()
    url = asset.get("browser_download_url", "")
    if not url or not name.endswith(".zip"):
        return -1
    if "x64" not in name:
        return -1
    if not re.search(r"whisper.*(bin|windows|win)", name):
        return -1

    value = 10
    if "bin-x64" in name:
        value += 20
    if "blas" in name:
        value += 5
    if any(marker in name for marker in ["cublas", "cuda", "vulkan", "openvino"]):
        value -= 15
    return value

ranked = sorted(((score(asset), asset) for asset in assets), key=lambda item: item[0], reverse=True)
if not ranked or ranked[0][0] < 0:
    names = ", ".join(asset.get("name", "") for asset in assets)
    raise SystemExit(f"Tidak menemukan asset Windows x64 ZIP. Assets: {names}")

print(ranked[0][1]["browser_download_url"])
PY
)"

echo "Download asset: $ASSET_URL"
curl --fail --location --output "$ZIP_PATH" "$ASSET_URL"

echo "Extract ke: $INSTALL_DIR"
uv run python - "$ZIP_PATH" "$INSTALL_DIR" <<'PY'
import sys
import zipfile

zip_path, install_dir = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path) as archive:
    archive.extractall(install_dir)
PY

FOUND_PATH="$(find "$INSTALL_DIR" -iname "whisper-cli.exe" | head -n 1)"
if [[ -z "$FOUND_PATH" ]]; then
  FOUND_PATH="$(find "$INSTALL_DIR" -iname "main.exe" -o -iname "whisper.exe" | head -n 1)"
fi

if [[ -z "$FOUND_PATH" ]]; then
  echo "Binary whisper.cpp tidak ditemukan setelah extract."
  exit 1
fi

echo "Download whisper.cpp CLI selesai: $FOUND_PATH"
echo "Jalankan ini sebelum start AI service:"
echo "export AI_STT_COMMAND_PATH=\"$PWD/$FOUND_PATH\""
