#Config model STT lokal untuk health check dan eksekusi transkripsi.
import os
import importlib.util
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
    model_dir: str
    dependency_exists: bool
    device: str
    compute_type: str
    cpu_threads: int
    num_workers: int
    batch_size: int
    max_concurrent_requests: int
    beam_size: int
    vad_filter: bool
    vad_min_silence_ms: int
    default_language: str | None
    condition_on_previous_text: bool
    preload_model: bool


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


def parse_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def parse_int_env(name: str, default: int, minimum: int = 0) -> int:
    value = os.getenv(name)

    if value is None:
        return default

    try:
        parsed = int(value)
    except ValueError:
        return default

    return max(minimum, parsed)


def normalize_optional_env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)

    if value is None:
        return default

    stripped = value.strip()
    return stripped or None


#Ambil config STT dari environment.
def get_model_config() -> SttModelConfig:
    load_local_env()
    current_dir = Path(__file__).resolve().parents[1]
    engine = os.getenv("AI_STT_ENGINE", "faster-whisper")
    is_faster_whisper = engine == "faster-whisper"
    default_model_id = "large-v3-turbo" if is_faster_whisper else "oxide-lab/whisper-medium-GGUF"
    default_model_file = "large-v3-turbo" if is_faster_whisper else "whisper-medium-q8_0.gguf"
    model_id = os.getenv("AI_STT_MODEL_ID", default_model_id)
    model_file = os.getenv("AI_STT_MODEL_FILE", default_model_file)
    configured_model_dir = Path(os.getenv("AI_STT_MODEL_DIR", "models/model_cache"))
    model_dir = configured_model_dir if configured_model_dir.is_absolute() else current_dir / configured_model_dir
    model_dir = model_dir.resolve()
    model_path = model_dir / model_file

    command_path = resolve_command_path(os.getenv("AI_STT_COMMAND_PATH", "whisper-cli"))
    dependency_exists = importlib.util.find_spec("faster_whisper") is not None if is_faster_whisper else True
    model_exists = (bool(model_id) and dependency_exists) if is_faster_whisper else model_path.is_file()

    return SttModelConfig(
        model_id=model_id,
        model_file=model_file,
        model_path=str(model_path),
        model_exists=model_exists,
        engine=engine,
        command_path=command_path,
        command_exists=True if is_faster_whisper else Path(command_path).is_file() or shutil.which(command_path) is not None,
        model_dir=str(model_dir),
        dependency_exists=dependency_exists,
        device=os.getenv("AI_STT_DEVICE", "auto"),
        compute_type=os.getenv("AI_STT_COMPUTE_TYPE", "auto"),
        cpu_threads=parse_int_env("AI_STT_CPU_THREADS", 0),
        num_workers=parse_int_env("AI_STT_NUM_WORKERS", 1, minimum=1),
        batch_size=parse_int_env("AI_STT_BATCH_SIZE", 8, minimum=1),
        max_concurrent_requests=parse_int_env("AI_STT_MAX_CONCURRENT_REQUESTS", 1, minimum=1),
        beam_size=parse_int_env("AI_STT_BEAM_SIZE", 1, minimum=1),
        vad_filter=parse_bool_env("AI_STT_VAD_FILTER", True),
        vad_min_silence_ms=parse_int_env("AI_STT_VAD_MIN_SILENCE_MS", 500, minimum=0),
        default_language=normalize_optional_env("AI_STT_DEFAULT_LANGUAGE", "auto"),
        condition_on_previous_text=parse_bool_env("AI_STT_CONDITION_ON_PREVIOUS_TEXT", False),
        preload_model=parse_bool_env("AI_STT_PRELOAD_MODEL", True),
    )
