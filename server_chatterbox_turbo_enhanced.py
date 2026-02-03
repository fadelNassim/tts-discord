#!/usr/bin/env python3
"""
server_chatterbox_turbo_enhanced.py
Qwen3-TTS FastAPI server with MP3 support and audio duration validation
Designed to work with TTS Discord client
"""

import gc
import re
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np
import soundfile as sf
import torch
import torchaudio as ta
from fastapi import FastAPI, Response, HTTPException
from pydantic import BaseModel, Field

# Try to import Qwen3TTSModel
try:
    from qwen_tts import Qwen3TTSModel
except ImportError:
    print("[ERROR] qwen-tts not installed. Run: pip install qwen-tts")
    exit(1)

# For MP3 support
try:
    import librosa
except ImportError:
    print("[WARNING] librosa not installed. MP3 support will be limited.")
    print("Install with: pip install librosa")
    librosa = None

# =======================
# OFFLINE MODEL LOADING
# =======================

def load_model_offline(device="auto"):
    """
    Load Qwen3-TTS in offline mode after initial authentication
    """
    model_id = os.environ.get("QWEN_TTS_MODEL", "Qwen/Qwen3-TTS-12Hz-1.7B-Base").strip()
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"

    device_map = "cuda:0" if device == "cuda" else "cpu"
    if device_map != "cpu":
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    else:
        dtype = torch.float32

    print(f"[INIT] Loading Qwen3-TTS in offline mode")
    print(f"[INIT] Model: {model_id}")
    print(f"[INIT] Device: {device_map}")

    # Set environment variables for offline mode
    os.environ.setdefault('TRANSFORMERS_OFFLINE', '1')
    os.environ.setdefault('HF_DATASETS_OFFLINE', '1')
    os.environ.setdefault('HF_HUB_OFFLINE', '1')
    os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')

    try:
        # First, try to load with offline settings
        model = Qwen3TTSModel.from_pretrained(
            model_id,
            device_map=device_map,
            dtype=dtype,
            local_files_only=True,
        )
        print("[INIT] Model loaded in offline mode")
        return model, device_map, model_id

    except Exception as e:
        print(f"[WARNING] Offline loading failed: {e}")
        print("[INIT] Trying standard loading (may require internet)...")

        try:
            model = Qwen3TTSModel.from_pretrained(
                model_id,
                device_map=device_map,
                dtype=dtype,
            )
            print("[INIT] Model loaded successfully")
            return model, device_map, model_id
        except Exception as e2:
            print(f"[ERROR] Failed to load model: {e2}")
            print("[INFO] Make sure you ran the setup script first:")
            print("  ./setup.sh <your-hf-token> [model-id]")
            raise

# =======================
# AUDIO UTILITIES
# =======================

def get_audio_duration(audio_path: Path) -> float:
    """
    Get duration of audio file in seconds
    """
    try:
        if audio_path.suffix.lower() == '.mp3' and librosa is not None:
            # Use librosa for MP3 files
            y, sr = librosa.load(audio_path, sr=None)
            duration = len(y) / sr
        else:
            # Use soundfile for WAV files
            audio, sr = sf.read(audio_path)
            duration = len(audio) / sr
        return duration
    except Exception as e:
        print(f"[ERROR] Failed to get duration for {audio_path}: {e}")
        return 0.0

def convert_mp3_to_wav(mp3_path: Path, wav_path: Path) -> bool:
    """
    Convert MP3 to WAV format using torchaudio
    """
    try:
        if librosa is not None:
            # Use librosa for better MP3 support
            y, sr = librosa.load(mp3_path, sr=None)
            ta.save(str(wav_path), torch.from_numpy(y).unsqueeze(0), sr)
        else:
            # Fallback to torchaudio
            waveform, sample_rate = ta.load(str(mp3_path))
            ta.save(str(wav_path), waveform, sample_rate)
        return True
    except Exception as e:
        print(f"[ERROR] Failed to convert {mp3_path} to WAV: {e}")
        return False

def validate_reference_audio(audio_path: Path) -> tuple[bool, str, float]:
    """
    Validate reference audio file
    Returns: (is_valid, error_message, duration_seconds)
    """
    if not audio_path.exists():
        return False, f"Audio file not found: {audio_path}", 0.0
    
    # Check file extension
    valid_extensions = ['.wav', '.mp3', '.ogg', '.flac']
    if audio_path.suffix.lower() not in valid_extensions:
        return False, f"Unsupported audio format: {audio_path.suffix}. Supported: {valid_extensions}", 0.0
    
    # Get duration
    duration = get_audio_duration(audio_path)
    if duration == 0.0:
        return False, f"Could not read audio file: {audio_path}", 0.0
    
    # Check minimum duration (5 seconds for Qwen3-TTS)
    if duration < 5.0:
        return False, f"Audio too short: {duration:.1f}s. Must be at least 5.0 seconds", duration
    
    print(f"[INFO] Valid reference audio: {audio_path.name} ({duration:.1f}s)")
    return True, "", duration

# =======================
# INIT
# =======================

# Load model
try:
    tts, device, model_id = load_model_offline()
except Exception as e:
    print(f"[ERROR] Failed to initialize model: {e}")
    exit(1)

try:
    SUPPORTED_LANGUAGES = tts.get_supported_languages() if tts else None
except Exception as e:
    SUPPORTED_LANGUAGES = None
    print(f"[WARNING] Failed to fetch supported languages: {e}")

 # =======================
 # REFERENCES DIRECTORY
 # =======================

def _get_references_dir() -> Path:
    """Resolve the server-side references directory.

    Note: The Electron UI's "voice directory" is only for client-side listing.
    The server always reads reference audio from its own filesystem.
    Override with env var `TTS_REFERENCES_DIR` when needed.
    """
    raw = os.environ.get("TTS_REFERENCES_DIR", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return (Path(__file__).parent / "references").resolve()


REF_DIR = _get_references_dir()

# Create references directory if it doesn't exist
REF_DIR.mkdir(exist_ok=True)

# Cache for validated reference files
validated_references = {}

def get_reference_path(voice_filename: str) -> Path:
    """
    Get the path to a reference audio file and validate it
    Returns the validated path or raises an exception
    """
    # Check if we have this voice cached
    if voice_filename in validated_references:
        return validated_references[voice_filename]["path"]
    
    # Look for the file in the references directory
    voice_path = REF_DIR / voice_filename
    
    # If the exact file doesn't exist, try to find it with different extensions
    if not voice_path.exists():
        # Try to find the file with any supported extension
        base_name = voice_path.stem
        for ext in ['.wav', '.mp3', '.ogg', '.flac']:
            candidate = REF_DIR / f"{base_name}{ext}"
            if candidate.exists():
                voice_path = candidate
                break
    
    if not voice_path.exists():
        available = []
        if REF_DIR.exists():
            for ext in ['.wav', '.mp3', '.ogg', '.flac']:
                available.extend([p.name for p in REF_DIR.glob(f"*{ext}")])
        available.sort()
        raise HTTPException(
            status_code=404,
            detail=(
                f"Voice file '{voice_filename}' not found in references directory: {REF_DIR}. "
                f"Available voices: {available}"
            ),
        )
    
    # Validate the audio file
    is_valid, error_msg, duration = validate_reference_audio(voice_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # If it's an MP3/OGG/FLAC, convert to WAV for processing
    if voice_path.suffix.lower() in ['.mp3', '.ogg', '.flac']:
        wav_path = voice_path.with_suffix('.wav')
        if not wav_path.exists():
            print(f"[INFO] Converting {voice_path.name} to WAV...")
            if not convert_mp3_to_wav(voice_path, wav_path):
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to convert {voice_filename} to WAV format"
                )
        voice_path = wav_path
    
    # Cache the validated reference
    validated_references[voice_filename] = {
        "path": voice_path,
        "duration": duration
    }
    
    return voice_path

# =======================
# FASTAPI
# =======================

app = FastAPI(title="Qwen3-TTS", version="1.0")

# TTS request model (used by both endpoints)
class TTSRequest(BaseModel):
    text: str
    voice: str
    language: str = Field(default="Auto")
    # Qwen3-TTS parameters
    temperature: float = Field(1.7, ge=0.05, le=5.0)  # Matches prior behavior for stability.
    top_p: float = Field(0.9, ge=0.0, le=1.0)
    top_k: int = Field(50, ge=1, le=100)
    repetition_penalty: float = Field(1.0, ge=0.5, le=2.0)

# =======================
# TEXT CLEANING
# =======================

def clean_text(text: str) -> str:
    """Clean and prepare text by removing control chars (0x00-0x1f, 0x7f) for multilingual input."""
    text = text.strip()
    text = re.sub(r"[\x00-\x1f\x7f]", "", text)
    return text[:600]

# =======================
# DEBUG HELPERS
# =======================

def log_audio_stats(tag: str, audio: np.ndarray, sr: int):
    """Log detailed audio statistics for debugging"""
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio ** 2)))
    clipped = int(np.sum(np.abs(audio) >= 1.0))

    print(
        f"[DEBUG] {tag}:\n"
        f"        SR={sr}\n"
        f"        dtype={audio.dtype}\n"
        f"        shape={audio.shape}\n"
        f"        peak={peak:.4f}\n"
        f"        rms={rms:.4f}\n"
        f"        clipped_samples={clipped}"
    )

# =======================
# FLOAT-SAFE LIMITER (WITH DEBUG)
# =======================

def peak_limit_float_debug(
    path: Path,
    target_dbfs: float = -1.0,
):
    """Apply peak limiting with detailed debug logging"""
    audio, sr = sf.read(path, dtype="float32")

    if audio.ndim > 1:
        audio = audio[:, 0]

    log_audio_stats("RAW FILE READ", audio, sr)

    peak = np.max(np.abs(audio))
    if peak <= 0:
        print("[DEBUG] Silent audio, skipping limiter")
        return

    target_peak = 10 ** (target_dbfs / 20.0)
    gain = min(1.0, target_peak / peak)

    print(f"[DEBUG] Applying gain: {gain:.4f}")

    audio *= gain
    audio = np.clip(audio, -1.0, 1.0)

    log_audio_stats("AFTER GAIN STAGING", audio, sr)

    sf.write(path, audio, sr, subtype="PCM_16")

    # Read back to verify no damage on write
    verify, _ = sf.read(path, dtype="float32")
    if verify.ndim > 1:
        verify = verify[:, 0]

    log_audio_stats("AFTER WAV WRITE (VERIFY)", verify, sr)

# =======================
# ENDPOINTS
# =======================

@app.post("/api/tts")
def api_tts_endpoint(req: TTSRequest):
    """
    TTS endpoint for client compatibility
    Accepts 'text' and 'voice' parameters with optional advanced settings
    """
    
    print(f"[DEBUG] API endpoint called")
    print(f"[DEBUG] Text: {req.text}")
    print(f"[DEBUG] Voice: {req.voice}")
    print(f"[DEBUG] Language: {req.language}")
    
    # Get the reference audio path
    ref_path = get_reference_path(req.voice)
    
    with NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        out_path = Path(tmp.name)

    try:
        # Clean the text
        cleaned_text = clean_text(req.text)
        print(f"[DEBUG] Cleaned text: {cleaned_text}")

        # Generate audio with Qwen3-TTS
        language = req.language.strip() or "Auto"
        if language != "Auto" and SUPPORTED_LANGUAGES:
            supported_lower = {lang.lower(): lang for lang in SUPPORTED_LANGUAGES}
            normalized = supported_lower.get(language.lower())
            if not normalized:
                raise ValueError(
                    f"Unsupported language '{language}'. Supported: {sorted(SUPPORTED_LANGUAGES)}"
                )
            language = normalized
        # Use x_vector_only_mode to avoid requiring reference transcripts.
        wavs, sample_rate = tts.generate_voice_clone(
            text=cleaned_text,
            language=language,
            ref_audio=str(ref_path),
            x_vector_only_mode=True,
            temperature=req.temperature,
            top_p=req.top_p,
            top_k=req.top_k,
            repetition_penalty=req.repetition_penalty
        )

        if not wavs:
            raise RuntimeError("No audio returned from Qwen3-TTS (check input text, reference audio, and model status)")

        # Save the generated audio
        sf.write(str(out_path), wavs[0], sample_rate)

        print("[DEBUG] Inference complete")

        # Apply peak limiting with debug
        peak_limit_float_debug(out_path, target_dbfs=-1.0)

        # Return the audio file
        return Response(
            content=out_path.read_bytes(),
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=out.wav"},
        )

    except ValueError as e:
        print(f"[ERROR] TTS request validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[ERROR] TTS generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")
        
    finally:
        # Cleanup
        out_path.unlink(missing_ok=True)
        if str(device).startswith("cuda"):
            torch.cuda.empty_cache()
        gc.collect()
        print("[DEBUG] Cleanup complete")

@app.post("/tts")
def tts_endpoint(req: TTSRequest):
    """TTS endpoint with full parameter control - same as /api/tts"""
    
    # Both endpoints now work identically
    return api_tts_endpoint(req)

# =======================
# HEALTH CHECK
# =======================

@app.get("/health")
def health():
    """Health check endpoint"""
    # Count available voice samples in references directory
    available_voices = []
    if REF_DIR.exists():
        for ext in ['.wav', '.mp3', '.ogg', '.flac']:
            available_voices.extend([f.name for f in REF_DIR.glob(f"*{ext}")])
    
    return {
        "status": "ok",
        "device": device,
        "cuda": torch.cuda.is_available(),
        "model": "qwen3-tts",
        "model_id": model_id,
        "references_directory": str(REF_DIR),
        "available_voices": len(available_voices),
        "voice_samples": available_voices,
        "model_loaded": tts is not None
    }

# =======================
# MODEL INFO
# =======================

@app.get("/info")
def model_info():
    """Get model information"""
    return {
        "model": "Qwen3-TTS",
        "version": "1.0",
        "device": device,
        "features": [
            "Zero-shot voice cloning",
            "Language selection",
            "Temperature control",
            "MP3/WAV/OGG/FLAC support",
            "Audio duration validation"
        ],
        "sample_rate": getattr(tts, 'sr', 24000),
        "endpoints": {
            "/api/tts": "TTS endpoint for client compatibility (text, voice)",
            "/tts": "TTS endpoint with full parameter control (same as /api/tts)",
            "/health": "Health check",
            "/info": "Model information",
            "/validate-references": "Validate reference audio files",
            "/list-voices": "List available voice samples"
        },
        "parameters": {
            "temperature": "0.05-5.0 (default: 1.7)",
            "top_p": "0.0-1.0 (default: 0.9)",
            "top_k": "1-100 (default: 50)",
            "repetition_penalty": "0.5-2.0 (default: 1.0)",
            "language": "Auto or supported language"
        },
        "supported_languages": SUPPORTED_LANGUAGES or [
            "Auto",
            "Chinese",
            "English",
            "Japanese",
            "Korean",
            "German",
            "French",
            "Russian",
            "Portuguese",
            "Spanish",
            "Italian"
        ],
        "reference_requirements": {
            "format": "WAV, MP3, OGG, or FLAC",
            "minimum_duration": "5.0 seconds",
            "directory": str(REF_DIR)
        }
    }

# =======================
# AUDIO VALIDATION ENDPOINT
# =======================

@app.get("/validate-references")
def validate_references():
    """Validate all reference audio files"""
    results = {}
    
    if not REF_DIR.exists():
        return {
            "error": "References directory does not exist",
            "directory": str(REF_DIR),
            "results": {}
        }
    
    # Find all audio files in references directory
    for ext in ['.wav', '.mp3', '.ogg', '.flac']:
        for audio_file in REF_DIR.glob(f"*{ext}"):
            is_valid, error_msg, duration = validate_reference_audio(audio_file)
            results[audio_file.name] = {
                "valid": is_valid,
                "duration": duration,
                "format": audio_file.suffix[1:],
                "error": error_msg if not is_valid else None
            }
    
    return {
        "directory": str(REF_DIR),
        "total_files": len(results),
        "valid_files": sum(1 for r in results.values() if r["valid"]),
        "results": results,
        "requirements": {
            "minimum_duration": 5.0,
            "supported_formats": [".wav", ".mp3", ".ogg", ".flac"]
        }
    }

# =======================
# LIST VOICES ENDPOINT
# =======================

@app.get("/list-voices")
def list_voices():
    """List all available voice samples"""
    voices = []
    
    if not REF_DIR.exists():
        return {
            "voices": [],
            "count": 0,
            "directory": str(REF_DIR),
            "error": "References directory does not exist"
        }
    
    # Find all audio files
    for ext in ['.wav', '.mp3', '.ogg', '.flac']:
        for audio_file in REF_DIR.glob(f"*{ext}"):
            is_valid, error_msg, duration = validate_reference_audio(audio_file)
            voices.append({
                "filename": audio_file.name,
                "valid": is_valid,
                "duration": duration,
                "format": audio_file.suffix[1:],
                "error": error_msg if not is_valid else None
            })
    
    return {
        "voices": voices,
        "count": len(voices),
        "valid_count": sum(1 for v in voices if v["valid"]),
        "directory": str(REF_DIR)
    }

# =======================
# RUN
# =======================

if __name__ == "__main__":
    import uvicorn
    print(f"[STARTUP] Starting Qwen3-TTS server on port 5002")
    print(f"[STARTUP] References directory: {REF_DIR}")
    print("[STARTUP] Override with: TTS_REFERENCES_DIR=/path/to/references")
    print("[STARTUP] Override model with: QWEN_TTS_MODEL=Qwen/Qwen3-TTS-12Hz-1.7B-Base")
    print(f"[STARTUP] Available endpoints:")
    print(f"         POST /api/tts - TTS with voice parameter (client compatible)")
    print(f"         POST /tts - TTS with full parameter control")
    print(f"         GET  /health - Health check")
    print(f"         GET  /info - Model information")
    print(f"         GET  /validate-references - Check reference audio files")
    print(f"         GET  /list-voices - List available voice samples")
    uvicorn.run(app, host="0.0.0.0", port=5002)
