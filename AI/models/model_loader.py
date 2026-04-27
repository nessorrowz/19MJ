#Config model STT lokal untuk health check dan eksekusi transkripsi.
import os
from pathlib import Path

from pydantic import BaseModel


class SttModelConfig(BaseModel):
    model_id: str
    model_file: str
    model_path: str
    model_exists: bool
    engine: str
    command_path: str


#Ambil config STT dari environment.
def get_model_config() -> SttModelConfig:
    model_file = os.getenv("AI_STT_MODEL_FILE", "whisper-medium-q8_0.gguf")
    model_dir = Path(os.getenv("AI_STT_MODEL_DIR", "models/model_cache")).resolve()
    model_path = model_dir / model_file

    return SttModelConfig(
        model_id=os.getenv("AI_STT_MODEL_ID", "oxide-lab/whisper-medium-GGUF"),
        model_file=model_file,
        model_path=str(model_path),
        model_exists=model_path.is_file(),
        engine=os.getenv("AI_STT_ENGINE", "whisper.cpp"),
        command_path=os.getenv("AI_STT_COMMAND_PATH", "whisper-cli"),
    )
