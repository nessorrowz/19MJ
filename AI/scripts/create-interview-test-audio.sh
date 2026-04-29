#!/usr/bin/env bash
#Buat file MP3 interview test dari teks skenario.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_OUTPUT="$AI_DIR/tes/interview-test.mp3"
OUTPUT_PATH="${1:-$DEFAULT_OUTPUT}"
TEXT_PATH="${2:-}"
TMP_WAV="${OUTPUT_PATH%.mp3}.wav"

DEFAULT_TEXT='Halo, saya adalah Kevin, kandidat backend engineer. Saya pernah membangun REST API menggunakan Node.js, Express, dan PostgreSQL. Dalam project terakhir, saya menangani autentikasi JWT, validasi input, dan integrasi layanan eksternal. Ketika terjadi bug production, saya mulai dari mitigasi cepat, mengecek log aplikasi, memeriksa query database, lalu membuat root cause analysis agar masalah yang sama tidak terulang. Saya juga terbiasa bekerja dengan frontend engineer untuk memastikan kontrak API jelas dan mudah dites.'

mkdir -p "$(dirname "$OUTPUT_PATH")"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg tidak ditemukan. Install ffmpeg dulu agar WAV bisa dikonversi ke MP3." >&2
  exit 1
fi

if [[ -n "$TEXT_PATH" ]]; then
  if [[ ! -f "$TEXT_PATH" ]]; then
    echo "File teks tidak ditemukan: $TEXT_PATH" >&2
    exit 1
  fi

  SPEECH_TEXT="$(cat "$TEXT_PATH")"
else
  SPEECH_TEXT="$DEFAULT_TEXT"
fi

export SPEECH_TEXT
export TMP_WAV

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "
Add-Type -AssemblyName System.Speech
\$text = \$env:SPEECH_TEXT
\$wavPath = \$env:TMP_WAV
\$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
\$speaker.Rate = -1
\$speaker.Volume = 100
\$speaker.SetOutputToWaveFile(\$wavPath)
\$speaker.Speak(\$text)
\$speaker.Dispose()
"

ffmpeg -y -hide_banner -loglevel error -i "$TMP_WAV" -codec:a libmp3lame -q:a 4 "$OUTPUT_PATH"
rm -f "$TMP_WAV"

echo "File MP3 berhasil dibuat: $OUTPUT_PATH"
