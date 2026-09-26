"""
Mockingbird IPA transcription service (Modal).

Pipeline, per request:
  1. decode the learner's clip (m4a from the phone, webm from web) -> 16 kHz
     mono PCM via ffmpeg
  2. recognise the *sounds actually produced* as IPA with a wav2vec2 phoneme
     CTC model (facebook/wav2vec2-xlsr-53-espeak-cv-ft). This is a phonetic
     transcriber, not a word recogniser, so mispronunciations survive instead
     of being "corrected" to the expected spelling.

Model: XLSR-53 (wav2vec 2.0 pretrained on ~56K hours across 53 languages,
including Spanish), fine-tuned on multilingual Common Voice with espeak IPA
labels. Paper: Xu, Baevski & Auli, "Simple and Effective Zero-shot
Cross-lingual Phoneme Recognition" (arXiv 2109.11680). Apache 2.0.

Returns: { ipa }

Setup / deploy: see ml/pronunciation/README.md.
"""

import base64
import os
import subprocess
import tempfile

import modal

MODEL_ID = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
CACHE_DIR = "/root/.cache/huggingface"


def _download_model() -> None:
    """Bake the model weights into the image so cold starts don't hit the hub."""
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL_ID, cache_dir=CACHE_DIR)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "espeak-ng")
    .pip_install(
        "torch==2.4.1",
        "transformers==4.44.2",
        "soundfile==0.12.1",
        "numpy<2",
        "huggingface_hub==0.25.2",
        "fastapi[standard]==0.115.4",
        # Wav2Vec2PhonemeCTCTokenizer (used by the espeak-ft processor) needs
        # this to init its tokenizer backend, even though we only run
        # recognition — it shells out to the espeak-ng apt package above.
        "phonemizer==3.2.1",
    )
    .env({"HF_HOME": CACHE_DIR})
    .run_function(_download_model)
)

app = modal.App("mockingbird-pronunciation", image=image)

# Lazily-initialised, container-cached heavy objects.
_state: dict = {}


def _load() -> dict:
    if _state:
        return _state

    import torch
    from transformers import AutoModelForCTC, AutoProcessor

    model = AutoModelForCTC.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR)
    model.eval()

    _state.update(
        torch=torch,
        processor=AutoProcessor.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR),
        model=model,
    )
    return _state


# ─── audio ────────────────────────────────────────────────────────────────────

_EXT = {
    "audio/m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
}


def _decode_audio(raw: bytes, mime: str):
    import numpy as np
    import soundfile as sf

    suffix = _EXT.get((mime or "").split(";")[0].strip(), ".bin")
    src = dst = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(raw)
            src = f.name
        dst = src + ".wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-ac", "1", "-ar", "16000", "-f", "wav", dst],
            check=True,
            capture_output=True,
        )
        audio, _ = sf.read(dst, dtype="float32")
    finally:
        for p in (src, dst):
            if p and os.path.exists(p):
                os.unlink(p)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return np.ascontiguousarray(audio)


def _recognise_ipa(audio) -> str:
    s = _load()
    torch = s["torch"]
    inputs = s["processor"](audio, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        logits = s["model"](inputs.input_values, attention_mask=inputs.get("attention_mask")).logits
    ids = torch.argmax(logits, dim=-1)
    text = s["processor"].batch_decode(ids)[0]
    # espeak CTC output is space-separated phones; collapse to a bare IPA string.
    return "".join(text.split())


# ─── web endpoint ─────────────────────────────────────────────────────────────


@app.function(
    secrets=[modal.Secret.from_name("pronunciation-secret")],
    scaledown_window=300,
    timeout=120,
)
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, Header, HTTPException
    from pydantic import BaseModel

    api = FastAPI()

    class TranscribeRequest(BaseModel):
        audio_b64: str
        mime: str = "audio/m4a"

    @api.get("/health")
    def health():
        return {"ok": True, "model": MODEL_ID}

    @api.post("/transcribe")
    def transcribe(body: TranscribeRequest, x_assess_secret: str | None = Header(default=None)):
        if x_assess_secret != os.environ["ASSESS_SECRET"]:
            raise HTTPException(status_code=401, detail="bad secret")

        if not body.audio_b64:
            raise HTTPException(status_code=400, detail="audio_b64 is required")

        try:
            raw = base64.b64decode(body.audio_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="audio_b64 is not valid base64")

        try:
            audio = _decode_audio(raw, body.mime)
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=422, detail="could not decode audio")

        if audio.size < 16000 * 0.3:  # < ~0.3 s
            raise HTTPException(status_code=422, detail="recording too short")

        return {"ipa": _recognise_ipa(audio)}

    return api
