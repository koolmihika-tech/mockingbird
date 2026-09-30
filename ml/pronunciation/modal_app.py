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

  3. if a target lyric line is sent: phonemize it with the model's own espeak
     phonemizer (voice "es" — same label space as the model's output, and it
     scored best on the Common Voice check), align the two phone sequences,
     and score them. Known Spanish allophones / accent variants (b~β, d~ð,
     ɡ~ɣ, θ~s, ...) cost little; any other substitution costs at least half
     a phone, scaled up by articulatory-feature distance (panphon).

Returns: { ipa } or, with a target,
         { ipa, target_ipa, spoken_ipa, score (0-100), alignment[] }

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
        "panphon==0.20.0",
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

    import panphon
    import torch
    from transformers import AutoModelForCTC, AutoProcessor

    model = AutoModelForCTC.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR)
    model.eval()

    _state.update(
        torch=torch,
        processor=AutoProcessor.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR),
        model=model,
        ft=panphon.FeatureTable(),
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


def _special_tokens() -> set:
    tok = _load()["processor"].tokenizer
    return {tok.word_delimiter_token, tok.pad_token, tok.unk_token, tok.bos_token, tok.eos_token}


def _recognise_phones(audio) -> list[str]:
    s = _load()
    torch = s["torch"]
    inputs = s["processor"](audio, sampling_rate=16000, return_tensors="pt")
    with torch.no_grad():
        logits = s["model"](inputs.input_values, attention_mask=inputs.get("attention_mask")).logits
    ids = torch.argmax(logits, dim=-1)
    text = s["processor"].batch_decode(ids)[0]
    # espeak CTC output is space-separated phones.
    special = _special_tokens()
    return [p for p in text.split() if p not in special]


def _target_words(text: str) -> list[list[str]]:
    """Lyric line -> phones per word, via the model's own espeak phonemizer."""
    tok = _load()["processor"].tokenizer
    raw = tok.phonemize(text, phonemizer_lang="es")
    special = _special_tokens()
    words = [[p for p in w.split() if p not in special] for w in raw.split(tok.word_delimiter_token)]
    return [w for w in words if w]


# ─── scoring ──────────────────────────────────────────────────────────────────

# Pairs that are allophones of the same Spanish phoneme, accepted accent
# variants (seseo, yeísmo), or espeak notation drift — close enough that they
# shouldn't count as real mistakes.
NEAR_MISS_COST = 0.25
NEAR_MISSES = {
    frozenset(p)
    for p in [
        ("b", "β"), ("β", "v"), ("b", "v"),
        ("d", "ð"),
        ("ɡ", "ɣ"),
        ("θ", "s"),
        ("ʝ", "j"), ("ʝ", "ʎ"), ("j", "ʎ"),
        ("x", "h"), ("x", "χ"),
        ("e", "ɛ"), ("o", "ɔ"),
        ("ɾ", "r"),
    ]
}
# Any other substitution costs at least this much, rising to 1.0 as the
# phones differ in more articulatory features (a 1-feature change like t~d or
# i~e is still a real mistake in Spanish).
MIN_SUB_COST = 0.5
FEATURES_FOR_FULL_COST = 6

_cost_cache: dict = {}


def _feature_cost(a: str, b: str) -> float:
    """Substitution cost in [0, 1]."""
    # Length marks aren't phonemic in Spanish; compare the base segments.
    a, b = a.replace("ː", ""), b.replace("ː", "")
    if a == b:
        return 0.0
    if frozenset((a, b)) in NEAR_MISSES:
        return NEAR_MISS_COST
    key = (a, b)
    if key not in _cost_cache:
        ft = _load()["ft"]
        try:
            va = ft.word_to_vector_list(a, numeric=True)
            vb = ft.word_to_vector_list(b, numeric=True)
            if not va or not vb:
                cost = 1.0
            else:
                diff = sum(1 for x, y in zip(va[0], vb[0]) if x != y)
                cost = min(1.0, max(MIN_SUB_COST, diff / FEATURES_FOR_FULL_COST))
        except Exception:
            cost = 1.0
        _cost_cache[key] = cost
    return _cost_cache[key]


def _align(target: list[str], spoken: list[str]) -> tuple[list[dict], float]:
    """Needleman-Wunsch over phones; indel = 1.0, sub = feature cost."""
    n, m = len(target), len(spoken)
    d = [[0.0] * (m + 1) for _ in range(n + 1)]
    bt = [[""] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        d[i][0], bt[i][0] = float(i), "del"
    for j in range(1, m + 1):
        d[0][j], bt[0][j] = float(j), "ins"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sub = d[i - 1][j - 1] + _feature_cost(target[i - 1], spoken[j - 1])
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
            t, sp = target[i - 1], spoken[j - 1]
            same = t.replace("ː", "") == sp.replace("ː", "")
            ops.append({"op": "equal" if same else "sub", "target": t, "spoken": sp})
            i, j = i - 1, j - 1
        elif step == "del":
            ops.append({"op": "delete", "target": target[i - 1], "spoken": None})
            i -= 1
        else:
            ops.append({"op": "insert", "target": None, "spoken": spoken[j - 1]})
            j -= 1
    ops.reverse()
    return ops, d[n][m]


def _assess(target_text: str, spoken: list[str]) -> dict:
    words = _target_words(target_text)
    target = [p for w in words for p in w]
    alignment, cost = _align(target, spoken)
    # Feature-weighted phone error rate -> 0-100 accuracy.
    score = round(max(0.0, 1.0 - cost / len(target)) * 100) if target else 0
    return {
        "target_ipa": " ".join("".join(w) for w in words),
        "spoken_ipa": "".join(spoken),
        "score": score,
        "alignment": alignment,
    }


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
        # Optional lyric line; when present the response includes a score.
        target_text: str | None = None

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

        spoken = _recognise_phones(audio)
        result = {"ipa": "".join(spoken)}
        target = (body.target_text or "").strip()
        if target:
            result.update(_assess(target, spoken))
        return result

    return api
