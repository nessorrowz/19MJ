#Service transkripsi lokal berbasis path audio.
import subprocess
import tempfile
import os
import time
from pathlib import Path
from typing import List

from pydantic import BaseModel, Field

from models.model_loader import get_allowed_audio_root, get_model_config, get_stt_temp_dir


class TranscriptionRequest(BaseModel):
    audio_path: str = Field(..., min_length=1)
    language: str | None = Field(default=None, max_length=20)


class TranscriptionSegment(BaseModel):
    start_seconds: float
    end_seconds: float
    text: str


class TranscriptionResponse(BaseModel):
    status: str
    transcript: str
    segments: List[TranscriptionSegment]
    latency_ms: int
    model: dict


class TranscriptionEngineError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


#Validasi file audio sebelum STT dijalankan.
def validate_audio_path(audio_path: str) -> Path:
    path = Path(audio_path).expanduser().resolve()
    allowed_root = get_allowed_audio_root()

    if not path.exists():
        raise FileNotFoundError("File audio tidak ditemukan.")

    if not path.is_file():
        raise ValueError("Path audio bukan file.")

    if not path.is_relative_to(allowed_root):
        raise ValueError("Path audio berada di luar direktori yang diizinkan.")

    return path


#Validasi binary dan model sebelum command STT dijalankan.
def validate_engine_ready(model) -> None:
    if not model.model_exists:
        raise TranscriptionEngineError("stt_model_not_found", f"File model STT tidak ditemukan: {model.model_path}")

    if not model.command_exists:
        raise TranscriptionEngineError("stt_command_not_found", f"Command STT tidak ditemukan: {model.command_path}")


#Bangun command whisper.cpp dengan output txt sementara.
def build_whisper_command(model, audio_path: Path, output_base: Path, language: str | None) -> list[str]:
    command = [
        model.command_path,
        "-m",
        model.model_path,
        "-f",
        str(audio_path),
        "-otxt",
        "-of",
        str(output_base),
    ]

    if language:
        command.extend(["-l", language])

    return command


#Ambil teks transcript dari file output atau stdout.
def read_transcript(output_txt_path: Path, stdout: str) -> str:
    if output_txt_path.is_file():
        return output_txt_path.read_text(encoding="utf-8").strip()

    return stdout.strip()


#Transcribe audio dan kembalikan kontrak response stabil.
def transcribe_audio(request: TranscriptionRequest) -> TranscriptionResponse:
    audio_path = validate_audio_path(request.audio_path)
    model = get_model_config()
    validate_engine_ready(model)

    timeout_seconds = int(os.getenv("AI_STT_TIMEOUT_SECONDS", "600"))
    started_at = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="19mj-stt-", dir=get_stt_temp_dir(), ignore_cleanup_errors=True) as temp_dir:
        output_base = Path(temp_dir) / "transcript"
        command = build_whisper_command(model, audio_path, output_base, request.language)

        try:
            result = subprocess.run(
                command,
                check=False,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired as error:
            raise TranscriptionEngineError("stt_timeout", f"Transkripsi melewati batas waktu {timeout_seconds} detik.") from error

        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip() or "Command STT gagal."
            raise TranscriptionEngineError("stt_command_failed", detail)

        transcript = read_transcript(output_base.with_suffix(".txt"), result.stdout)

    return TranscriptionResponse(
        status="completed",
        transcript=transcript,
        segments=[],
        latency_ms=round((time.perf_counter() - started_at) * 1000),
        model=model.model_dump() | {"audio_path": str(audio_path)},
    )
