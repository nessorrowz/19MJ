#Service transkripsi lokal berbasis path audio.
import subprocess
import tempfile
import os
import sys
import time
import threading
from pathlib import Path
from typing import List

from pydantic import BaseModel, Field

from models.model_loader import get_allowed_audio_root, get_model_config, get_stt_temp_dir


class TranscriptionRequest(BaseModel):
    audio_path: str = Field(..., min_length=1)
    language: str | None = Field(default=None, max_length=20)
    context_prompt: str | None = Field(default=None, max_length=2000)
    hotwords: str | None = Field(default=None, max_length=1000)


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


_faster_whisper_lock = threading.Lock()
_faster_whisper_key = None
_faster_whisper_model = None
_faster_whisper_pipeline = None
_cuda_dll_dirs_loaded = False
_cuda_dll_dir_handles = []
_transcription_semaphore = None
_transcription_semaphore_key = None
_transcription_semaphore_lock = threading.Lock()


#Validasi file audio sebelum STT dijalankan.
def validate_audio_path(audio_path: str) -> Path:
    path = Path(audio_path).expanduser().resolve()
    allowed_root = get_allowed_audio_root()

    if not path.exists():
        raise FileNotFoundError("File audio tidak ditemukan.")

    if not path.is_file():
        raise ValueError(f"Path audio bukan file: {path}")

    if not path.is_relative_to(allowed_root):
        raise ValueError(f"Path audio {path} berada di luar direktori yang diizinkan {allowed_root}")

    return path


#Validasi binary dan model sebelum command STT dijalankan.
def validate_engine_ready(model) -> None:
    if model.engine == "faster-whisper":
        if not model.dependency_exists:
            raise TranscriptionEngineError("stt_dependency_not_found", "Dependency faster-whisper belum terinstall.")

        if not model.model_id:
            raise TranscriptionEngineError("stt_model_not_found", "AI_STT_MODEL_ID wajib diisi.")

        return

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


def normalize_language(language: str | None, default_language: str | None) -> str | None:
    selected_language = (language or default_language or "").strip().lower()

    if not selected_language or selected_language == "auto":
        return None

    if selected_language not in {"id", "en"}:
        raise ValueError("Bahasa STT hanya mendukung auto, id, atau en.")

    return selected_language


def normalize_optional_text(value: str | None) -> str | None:
    if not value:
        return None

    stripped = " ".join(value.split())
    return stripped or None


def resolve_faster_whisper_device(config) -> str:
    if config.device != "auto":
        return config.device

    try:
        import ctranslate2
    except ImportError:
        return "cpu"

    if ctranslate2.get_cuda_device_count() <= 0:
        return "cpu"

    if os.name == "nt" and not has_windows_cuda_runtime():
        return "cpu"

    return "cuda"


def has_windows_cuda_runtime() -> bool:
    ensure_cuda_dll_directories()

    for path_dir in os.getenv("PATH", "").split(os.pathsep):
        if Path(path_dir, "cublas64_12.dll").is_file():
            return True

    return False


def candidate_cuda_dll_directories() -> list[Path]:
    roots = [Path(sys.prefix), Path(__file__).resolve().parents[1] / ".venv"]
    relative_dirs = [
        Path("Lib/site-packages/nvidia/cublas/bin"),
        Path("Lib/site-packages/nvidia/cudnn/bin"),
        Path("Lib/site-packages/nvidia/cuda_nvrtc/bin"),
        Path("Lib/site-packages/ctranslate2"),
    ]

    return [root / relative_dir for root in roots for relative_dir in relative_dirs]


#Tambahkan DLL CUDA dari venv agar GPU inference jalan tanpa restart.
def ensure_cuda_dll_directories() -> None:
    global _cuda_dll_dirs_loaded

    if _cuda_dll_dirs_loaded or os.name != "nt":
        return

    existing_path = os.getenv("PATH", "")
    next_paths = []

    for dll_dir in candidate_cuda_dll_directories():
        if not dll_dir.is_dir():
            continue

        dll_dir_text = str(dll_dir)
        if dll_dir_text not in existing_path:
            next_paths.append(dll_dir_text)

        if hasattr(os, "add_dll_directory"):
            _cuda_dll_dir_handles.append(os.add_dll_directory(dll_dir_text))

    if next_paths:
        os.environ["PATH"] = os.pathsep.join(next_paths + [existing_path])

    _cuda_dll_dirs_loaded = True


def resolve_faster_whisper_compute_type(config, device: str) -> str:
    if config.compute_type != "auto":
        return config.compute_type

    return "float16" if device == "cuda" else "int8"


def resolve_faster_whisper_cpu_threads(config, device: str) -> int:
    if config.cpu_threads > 0:
        return config.cpu_threads

    if device == "cuda":
        return 0

    return min(16, os.cpu_count() or 1)


def resolve_faster_whisper_batch_size(config, device: str) -> int:
    return config.batch_size if device == "cuda" else 1


def resolve_faster_whisper_model_reference(config) -> str:
    model_path = Path(config.model_path)
    model_dir = Path(config.model_dir)

    if model_path.is_dir():
        return str(model_path)

    if (model_dir / "model.bin").is_file():
        return str(model_dir)

    return config.model_id


def is_cuda_runtime_error(error: Exception) -> bool:
    message = str(error).lower()
    return any(marker in message for marker in ["cuda", "cublas", "cudnn"])


def get_faster_whisper_runtime(config, forced_device: str | None = None):
    ensure_cuda_dll_directories()
    device = forced_device or resolve_faster_whisper_device(config)
    compute_type = resolve_faster_whisper_compute_type(config, device)
    cpu_threads = resolve_faster_whisper_cpu_threads(config, device)
    cache_key = (
        config.model_id,
        config.model_dir,
        device,
        compute_type,
        cpu_threads,
        config.num_workers,
    )

    return cache_key, device, compute_type, cpu_threads


#Muat model sekali agar request berikutnya tidak bayar startup cost.
def get_faster_whisper_model(config, forced_device: str | None = None):
    global _faster_whisper_key, _faster_whisper_model, _faster_whisper_pipeline

    cache_key, device, compute_type, cpu_threads = get_faster_whisper_runtime(config, forced_device=forced_device)

    if _faster_whisper_model is not None and _faster_whisper_key == cache_key:
        return _faster_whisper_model, device, compute_type

    with _faster_whisper_lock:
        if _faster_whisper_model is not None and _faster_whisper_key == cache_key:
            return _faster_whisper_model, device, compute_type

        try:
            from faster_whisper import WhisperModel
        except ImportError as error:
            raise TranscriptionEngineError("stt_dependency_not_found", "Dependency faster-whisper belum terinstall.") from error

        try:
            _faster_whisper_model = WhisperModel(
                resolve_faster_whisper_model_reference(config),
                device=device,
                compute_type=compute_type,
                download_root=config.model_dir,
                cpu_threads=cpu_threads,
                num_workers=config.num_workers,
            )
            _faster_whisper_pipeline = None
            _faster_whisper_key = cache_key
        except Exception as error:
            raise TranscriptionEngineError("stt_model_load_failed", f"Model faster-whisper gagal dimuat: {error}") from error

        return _faster_whisper_model, device, compute_type


def get_faster_whisper_pipeline(config, forced_device: str | None = None):
    global _faster_whisper_pipeline

    model, device, compute_type = get_faster_whisper_model(config, forced_device=forced_device)

    if _faster_whisper_pipeline is not None:
        return _faster_whisper_pipeline, device, compute_type

    with _faster_whisper_lock:
        if _faster_whisper_pipeline is not None:
            return _faster_whisper_pipeline, device, compute_type

        try:
            from faster_whisper import BatchedInferencePipeline
        except ImportError as error:
            raise TranscriptionEngineError("stt_dependency_not_found", "Dependency faster-whisper belum terinstall.") from error

        _faster_whisper_pipeline = BatchedInferencePipeline(model=model)
        return _faster_whisper_pipeline, device, compute_type


def preload_stt_model() -> None:
    config = get_model_config()
    validate_engine_ready(config)

    if config.engine == "faster-whisper" and config.preload_model:
        get_faster_whisper_model(config)


def get_transcription_semaphore(config):
    global _transcription_semaphore, _transcription_semaphore_key

    if _transcription_semaphore is not None and _transcription_semaphore_key == config.max_concurrent_requests:
        return _transcription_semaphore

    with _transcription_semaphore_lock:
        if _transcription_semaphore is not None and _transcription_semaphore_key == config.max_concurrent_requests:
            return _transcription_semaphore

        _transcription_semaphore = threading.BoundedSemaphore(config.max_concurrent_requests)
        _transcription_semaphore_key = config.max_concurrent_requests
        return _transcription_semaphore


def run_faster_whisper_transcription(config, request: TranscriptionRequest, audio_path: Path, forced_device: str | None = None):
    model, device, compute_type = get_faster_whisper_model(config, forced_device=forced_device)
    selected_language = normalize_language(request.language, config.default_language)
    context_prompt = normalize_optional_text(request.context_prompt)
    hotwords = normalize_optional_text(request.hotwords)
    vad_parameters = {"min_silence_duration_ms": config.vad_min_silence_ms}
    batch_size = resolve_faster_whisper_batch_size(config, device)
    inference = "batched" if device == "cuda" else "standard"

    if inference == "batched":
        pipeline, device, compute_type = get_faster_whisper_pipeline(config, forced_device=forced_device)
        segments, info = pipeline.transcribe(
            str(audio_path),
            language=selected_language,
            task="transcribe",
            beam_size=config.beam_size,
            temperature=0,
            vad_filter=config.vad_filter,
            vad_parameters=vad_parameters,
            condition_on_previous_text=config.condition_on_previous_text,
            batch_size=batch_size,
            initial_prompt=context_prompt,
            hotwords=hotwords,
        )
    else:
        segments, info = model.transcribe(
            str(audio_path),
            language=selected_language,
            task="transcribe",
            beam_size=config.beam_size,
            temperature=0,
            vad_filter=config.vad_filter,
            vad_parameters=vad_parameters,
            condition_on_previous_text=config.condition_on_previous_text,
            initial_prompt=context_prompt,
            hotwords=hotwords,
        )
    segment_list = [
        TranscriptionSegment(
            start_seconds=segment.start,
            end_seconds=segment.end,
            text=segment.text.strip(),
        )
        for segment in segments
        if segment.text and segment.text.strip()
    ]
    transcript = " ".join(segment.text for segment in segment_list).strip()
    metadata = {
        "runtime_device": device,
        "runtime_compute_type": compute_type,
        "runtime_cpu_threads": resolve_faster_whisper_cpu_threads(config, device),
        "runtime_batch_size": batch_size,
        "runtime_inference": inference,
        "detected_language": getattr(info, "language", None),
        "language_probability": getattr(info, "language_probability", None),
        "duration": getattr(info, "duration", None),
        "duration_after_vad": getattr(info, "duration_after_vad", None),
        "context_prompt_used": bool(context_prompt),
        "hotwords_used": bool(hotwords),
    }

    return transcript, segment_list, metadata


def transcribe_with_faster_whisper(config, request: TranscriptionRequest, audio_path: Path):
    try:
        return run_faster_whisper_transcription(config, request, audio_path)
    except TranscriptionEngineError:
        raise
    except Exception as error:
        if config.device == "auto" and is_cuda_runtime_error(error):
            try:
                transcript, segments, metadata = run_faster_whisper_transcription(config, request, audio_path, forced_device="cpu")
            except Exception as fallback_error:
                raise TranscriptionEngineError("stt_command_failed", f"Transkripsi faster-whisper gagal: {fallback_error}") from fallback_error

            return transcript, segments, metadata | {"runtime_fallback": "cuda_to_cpu"}

        raise TranscriptionEngineError("stt_command_failed", f"Transkripsi faster-whisper gagal: {error}") from error


def transcribe_with_whisper_cpp(config, audio_path: Path, language: str | None) -> tuple[str, list[TranscriptionSegment], dict]:
    timeout_seconds = int(os.getenv("AI_STT_TIMEOUT_SECONDS", "600"))

    with tempfile.TemporaryDirectory(prefix="19mj-stt-", dir=get_stt_temp_dir(), ignore_cleanup_errors=True) as temp_dir:
        output_base = Path(temp_dir) / "transcript"
        command = build_whisper_command(config, audio_path, output_base, language)

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

    return transcript, [], {}


#Transcribe audio dan kembalikan kontrak response stabil.
def transcribe_audio(request: TranscriptionRequest) -> TranscriptionResponse:
    audio_path = validate_audio_path(request.audio_path)
    model = get_model_config()
    validate_engine_ready(model)

    started_at = time.perf_counter()

    with get_transcription_semaphore(model):
        if model.engine == "faster-whisper":
            transcript, segments, runtime_metadata = transcribe_with_faster_whisper(model, request, audio_path)
        else:
            transcript, segments, runtime_metadata = transcribe_with_whisper_cpp(model, audio_path, request.language)

    return TranscriptionResponse(
        status="completed",
        transcript=transcript,
        segments=segments,
        latency_ms=round((time.perf_counter() - started_at) * 1000),
        model=model.model_dump() | runtime_metadata | {"audio_path": str(audio_path)},
    )
