#Config model STT lokal untuk health check dan eksekusi transkripsi.
import os
import shutil
from pathlib import Path

from pydantic import BaseModel


class SttModelConfig(BaseModel):
    model_id: str
    model_file: str
    model_path: str
    model_exists: bool
    engine: str
    command_path: str
    command_exists: bool


def load_env_file(path: Path, override: bool = False) -> None:
    if not path.is_file():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        key = key.strip()
        if override or key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


def load_local_env() -> None:
    current_dir = Path(__file__).resolve().parents[1]
    workspace_dir = current_dir.parent
    load_env_file(current_dir / ".env")
    load_env_file(workspace_dir / "BE" / ".env")


def resolve_command_path(command_path: str) -> str:
    path = Path(command_path)

    if path.name.lower() == "main.exe":
        replacement = path.with_name("whisper-cli.exe")
        if replacement.is_file():
            return str(replacement)

    return command_path


def get_stt_temp_dir() -> Path:
    current_dir = Path(__file__).resolve().parents[1]
    configured_dir = Path(os.getenv("AI_STT_TEMP_DIR", "storage/stt_tmp"))
    temp_dir = configured_dir if configured_dir.is_absolute() else current_dir / configured_dir
    temp_dir = temp_dir.resolve()
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir


def get_allowed_audio_root() -> Path:
    load_local_env()
    current_dir = Path(__file__).resolve().parents[1]
    configured_root = Path(os.getenv("AI_ALLOWED_AUDIO_ROOT", str(workspace_default_audio_root(current_dir))))
    return configured_root.expanduser().resolve()


def workspace_default_audio_root(current_dir: Path) -> Path:
    workspace_dir = current_dir.parent
    return workspace_dir / "BE" / "storage" / "interviews"


#Ambil config STT dari environment.
def get_model_config() -> SttModelConfig:
    load_local_env()
    current_dir = Path(__file__).resolve().parents[1]
    model_file = os.getenv("AI_STT_MODEL_FILE", "whisper-medium-q8_0.gguf")
    configured_model_dir = Path(os.getenv("AI_STT_MODEL_DIR", "models/model_cache"))
    model_dir = configured_model_dir if configured_model_dir.is_absolute() else current_dir / configured_model_dir
    model_dir = model_dir.resolve()
    model_path = model_dir / model_file

    command_path = resolve_command_path(os.getenv("AI_STT_COMMAND_PATH", "whisper-cli"))

    return SttModelConfig(
        model_id=os.getenv("AI_STT_MODEL_ID", "oxide-lab/whisper-medium-GGUF"),
        model_file=model_file,
        model_path=str(model_path),
        model_exists=model_path.is_file(),
        engine=os.getenv("AI_STT_ENGINE", "whisper.cpp"),
        command_path=command_path,
        command_exists=Path(command_path).is_file() or shutil.which(command_path) is not None,
    )
