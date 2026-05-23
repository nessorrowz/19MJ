#FastAPI service untuk STT lokal.
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from services.transcription_service import TranscriptionEngineError, TranscriptionRequest, preload_stt_model, transcribe_audio
from models.model_loader import get_model_config


#Preload STT agar request pertama tidak kena cold-start model.
@asynccontextmanager
async def lifespan(_app: FastAPI):
    preload_stt_model()
    yield


app = FastAPI(title="19MJ Local STT Service", lifespan=lifespan)


#Validasi token internal hanya jika env token diset.
def verify_service_token(x_19mj_ai_token: str | None = Header(default=None)):
    expected_token = os.getenv("AI_SERVICE_TOKEN")

    if expected_token and x_19mj_ai_token != expected_token:
        raise HTTPException(
            status_code=401,
            detail={"code": "ai_service_unauthorized", "message": "Akses AI service tidak valid."},
        )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "19MJ Local STT",
        "model": get_model_config().model_dump(),
    }


@app.post("/transcribe")
def transcribe(request: TranscriptionRequest, _=Depends(verify_service_token)):
    try:
        return transcribe_audio(request)
    except FileNotFoundError as error:
        raise HTTPException(status_code=400, detail={"code": "audio_file_not_found", "message": str(error)})
    except ValueError as error:
        raise HTTPException(status_code=400, detail={"code": "invalid_audio_path", "message": str(error)})
    except TranscriptionEngineError as error:
        raise HTTPException(status_code=503, detail={"code": error.code, "message": str(error)})
