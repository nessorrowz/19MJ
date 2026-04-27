#FastAPI service untuk STT lokal.
from fastapi import FastAPI, HTTPException

from services.transcription_service import TranscriptionRequest, transcribe_audio
from models.model_loader import get_model_config

app = FastAPI(title="19MJ Local STT Service")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "19MJ Local STT",
        "model": get_model_config().model_dump(),
    }


@app.post("/transcribe")
def transcribe(request: TranscriptionRequest):
    try:
        return transcribe_audio(request)
    except FileNotFoundError as error:
        raise HTTPException(status_code=400, detail={"code": "audio_file_not_found", "message": str(error)})
    except ValueError as error:
        raise HTTPException(status_code=400, detail={"code": "invalid_audio_path", "message": str(error)})
