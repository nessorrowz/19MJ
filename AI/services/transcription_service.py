#Service transkripsi lokal berbasis path audio.
from pathlib import Path
from typing import List

from pydantic import BaseModel, Field

from models.model_loader import get_model_config


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
    model: dict


#Validasi file audio sebelum STT dijalankan.
def validate_audio_path(audio_path: str) -> Path:
    path = Path(audio_path).expanduser().resolve()

    if not path.exists():
        raise FileNotFoundError(f"File audio tidak ditemukan: {path}")

    if not path.is_file():
        raise ValueError(f"Path audio bukan file: {path}")

    return path


#Transcribe audio dan kembalikan kontrak response stabil.
def transcribe_audio(request: TranscriptionRequest) -> TranscriptionResponse:
    audio_path = validate_audio_path(request.audio_path)
    model = get_model_config()

    return TranscriptionResponse(
        status="pending_engine",
        transcript="",
        segments=[],
        model=model.model_dump() | {"audio_path": str(audio_path)},
    )
