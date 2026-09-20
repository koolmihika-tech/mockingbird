"""
Mockingbird pronunciation-assessment service (Modal).

Pipeline, per request:
  1. decode the learner's clip (m4a from the phone, webm from web) -> 16 kHz
     mono PCM via ffmpeg
  2. recognise the *sounds actually produced* as IPA with a wav2vec2 phoneme
     CTC model (facebook/wav2vec2-lv-60-espeak-cv-ft) -- this is a phonetic
     transcriber, not a word recogniser, so mispronunciations survive instead
     of being "corrected" to the expected spelling
  3. generate the *target* IPA for the lyric line with epitran (Spanish
     orthography is near-phonemic, so this is reliable and free)
  4. align the two phone sequences and score them, weighting substitutions by
     articulatory-feature distance (panphon) so allophonic near-misses
     (b~beta, r~flap, d~eth) cost less than genuinely wrong sounds

Returns: { target_ipa, spoken_ipa, score (0-100), alignment[] }

Deploy:
  pip install modal && modal setup                 # one-time auth, no card
  modal secret create pronunciation-secret ASSESS_SECRET=$(openssl rand -hex 24)
  modal deploy ml/pronunciation/modal_app.py
  # -> https://<workspace>--mockingbird-pronunciation-web.modal.run

Then set the Supabase edge-function secrets (see ml/pronunciation/README.md):
  PRONUNCIATION_URL     = https://<...>-web.modal.run/assess
  PRONUNCIATION_SECRET  = <the ASSESS_SECRET value>

Billing: Modal's Starter plan is free — $30/month of included credits, no
credit card required to sign up. At this service's cost (a few seconds of CPU
per assessment, including cold starts) that covers on the order of tens of
thousands of assessments/month before anything would ever be billed, and
nothing is billed unless you later add a card yourself.

This is a v1 baseline. Known rough edges are documented in README.md
(espeak vs epitran phone-set drift, singing vs speech, no forced alignment /
GOP yet).
"""

import base64
import os
import subprocess
import tempfile

import modal

MODEL_ID = "facebook/wav2vec2-lv-60-espeak-cv-ft"
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
        "panphon==0.20.0",
        "epitran==1.25.1",
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

    import epitran
    import panphon
    import panphon.distance
    import torch
    from transformers import AutoModelForCTC, AutoProcessor

    model = AutoModelForCTC.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR)
    model.eval()

    _state.update(
        torch=torch,
        processor=AutoProcessor.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR),
        model=model,
        epi=epitran.Epitran("spa-Latn"),
        ft=panphon.FeatureTable(),
        dist=panphon.distance.Distance(),
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


# ─── scoring ──────────────────────────────────────────────────────────────────


def _feature_cost(a: str, b: str) -> float:
    """Substitution cost in [0, 1] from panphon feature vectors."""
    if a == b:
        return 0.0
    s = _load()
    try:
        va = s["ft"].word_to_vector_list(a, numeric=True)
        vb = s["ft"].word_to_vector_list(b, numeric=True)
        if not va or not vb:
            return 1.0
        va, vb = va[0], vb[0]
        diff = sum(1 for x, y in zip(va, vb) if x != y)
        return min(1.0, diff / len(va))
    except Exception:
        return 1.0


def _align(target_segs: list[str], spoken_segs: list[str]) -> list[dict]:
    """Needleman-Wunsch over phone segments; indel = 1.0, sub = feature cost."""
    n, m = len(target_segs), len(spoken_segs)
    d = [[0.0] * (m + 1) for _ in range(n + 1)]
    bt = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        d[i][0] = i
        bt[i][0] = "del"
    for j in range(1, m + 1):
        d[0][j] = j
        bt[0][j] = "ins"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sub = d[i - 1][j - 1] + _feature_cost(target_segs[i - 1], spoken_segs[j - 1])
            dele = d[i - 1][j] + 1.0
            ins = d[i][j - 1] + 1.0
            best = min(sub, dele, ins)
            d[i][j] = best
            bt[i][j] = "sub" if best == sub else ("del" if best == dele else "ins")

    ops: list[dict] = []
    i, j = n, m
    while i > 0 or j > 0:
        step = bt[i][j]
        if step == "sub":
            t, sp = target_segs[i - 1], spoken_segs[j - 1]
            ops.append({"op": "equal" if t == sp else "sub", "target": t, "spoken": sp})
            i, j = i - 1, j - 1
        elif step == "del":
            ops.append({"op": "delete", "target": target_segs[i - 1], "spoken": None})
            i -= 1
        else:
            ops.append({"op": "insert", "target": None, "spoken": spoken_segs[j - 1]})
            j -= 1
    ops.reverse()
    return ops


def _score(target_ipa: str, spoken_ipa: str) -> dict:
    s = _load()
    target_segs = s["ft"].ipa_segs(target_ipa)
    spoken_segs = s["ft"].ipa_segs(spoken_ipa)
    alignment = _align(target_segs, spoken_segs)

    if not target_segs:
        return {"score": 0, "alignment": alignment}

    # Feature-weighted phone error rate -> 0-100 accuracy.
    dist = s["dist"].weighted_feature_edit_distance(target_ipa, spoken_ipa)
    per = dist / max(len(target_segs), 1)
    score = round(max(0.0, min(1.0, 1.0 - per)) * 100)
    return {"score": score, "alignment": alignment}


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

    class AssessRequest(BaseModel):
        target_text: str
        audio_b64: str
        mime: str = "audio/m4a"

    @api.get("/health")
    def health():
        return {"ok": True}

    @api.post("/assess")
    def assess(body: AssessRequest, x_assess_secret: str | None = Header(default=None)):
        expected = os.environ["ASSESS_SECRET"]
        if x_assess_secret != expected:
            raise HTTPException(status_code=401, detail="bad secret")

        target = body.target_text.strip()
        if not target or not body.audio_b64:
            raise HTTPException(status_code=400, detail="target_text and audio_b64 are required")

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

        spoken_ipa = _recognise_ipa(audio)
        target_ipa = _load()["epi"].transliterate(target)
        return {"target_ipa": target_ipa, "spoken_ipa": spoken_ipa, **_score(target_ipa, spoken_ipa)}

    return api
