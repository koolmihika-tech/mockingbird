"""
Accuracy check for the IPA transcriber on Common Voice Spanish (Modal).

Measures phone error rate (PER) of the model served by modal_app.py on a
fixed-seed random sample of the Common Voice 17.0 Spanish *test* split.

  reference = espeak-ng IPA of the clip's sentence (same kind of label the
              model was fine-tuned on), via the model's own phonemizer
  hypothesis = model output on the clip audio
  PER = (substitutions + deletions + insertions) / reference phones

The reference is scored against two espeak voices, because Common Voice
Spanish speakers are mostly Latin American while espeak's default "es" voice
is Castilian (θ for c/z, etc.):
  es      Castilian — matches the default espeak Spanish labels
  es-419  Latin American

Data: Mozilla moved Common Voice off Hugging Face, so this reads the CC0
parquet mirror fixie-ai/common_voice_17_0 (es/test-*.parquet, 15,857 clips).

Caveat: the model was fine-tuned on an older Common Voice release. CV splits
are speaker-disjoint within a release, not across releases, so some CV 17.0
test sentences/speakers may have been seen in training — treat PER as an
optimistic bound for clean read speech, not for learners.

Run (from the repo root):
  modal run ml/pronunciation/eval_common_voice_es.py               # 500 clips
  modal run ml/pronunciation/eval_common_voice_es.py --n 2000 --seed 1

Writes ml/pronunciation/eval/cv_es_<model>_n<N>_seed<S>.json (summary) and
.csv (per-clip reference / hypothesis / PER).
"""

import csv
import json
import random
from collections import Counter
from pathlib import Path

import modal

MODEL_ID = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
DATASET_REPO = "fixie-ai/common_voice_17_0"
TEST_SHARDS = [f"es/test-{i:05d}-of-00008.parquet" for i in range(8)]
VOICES = ["es", "es-419"]
CACHE_DIR = "/root/.cache/huggingface"


def _download_model() -> None:
    from huggingface_hub import snapshot_download

    snapshot_download(MODEL_ID, cache_dir=CACHE_DIR)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "espeak-ng")
    .pip_install(
        "torch==2.4.1",
        "transformers==4.44.2",
        "numpy<2",
        "pyarrow==17.0.0",
        "huggingface_hub==0.25.2",
        "phonemizer==3.2.1",
    )
    .env({"HF_HOME": CACHE_DIR})
    .run_function(_download_model)
)

app = modal.App("mockingbird-pronunciation-eval", image=image)


# ─── helpers (run inside the container) ──────────────────────────────────────


def _decode_mp3(raw: bytes):
    """Common Voice clips are 48 kHz mp3 -> 16 kHz mono float32."""
    import subprocess

    import numpy as np

    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"],
        input=raw,
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(out, dtype=np.float32)


def _phones(text: str, special: set[str]) -> list[str]:
    """Space-separated phone string -> list, dropping word delimiters/specials."""
    return [p for p in text.split() if p not in special]


def _edit_ops(ref: list[str], hyp: list[str]) -> tuple[int, int, int, list[tuple[str, str]]]:
    """Levenshtein alignment -> (subs, dels, ins, substitution pairs)."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(
                d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]),
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
            )
    subs = dels = ins = 0
    pairs: list[tuple[str, str]] = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            if ref[i - 1] != hyp[j - 1]:
                subs += 1
                pairs.append((ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i - 1][j] + 1:
            dels += 1
            i -= 1
        else:
            ins += 1
            j -= 1
    return subs, dels, ins, pairs


@app.function(cpu=8.0, memory=8192, timeout=3600)
def evaluate(n: int, seed: int) -> dict:
    import pyarrow.parquet as pq
    import torch
    from huggingface_hub import hf_hub_download
    from transformers import AutoModelForCTC, AutoProcessor

    processor = AutoProcessor.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR)
    model = AutoModelForCTC.from_pretrained(MODEL_ID, cache_dir=CACHE_DIR).eval()
    tok = processor.tokenizer
    special = {tok.word_delimiter_token, tok.pad_token, tok.unk_token, tok.bos_token, tok.eos_token}

    # Load every test shard's metadata, then sample clips across all of them.
    tables = []
    for shard in TEST_SHARDS:
        path = hf_hub_download(DATASET_REPO, shard, repo_type="dataset")
        tables.append(pq.read_table(path, columns=["path", "sentence", "audio", "accent"]))
    index = [(t, r) for t, table in enumerate(tables) for r in range(table.num_rows)]
    rng = random.Random(seed)
    sample = rng.sample(index, min(n, len(index)))
    print(f"sampled {len(sample)} of {len(index)} test clips")

    totals = {v: Counter() for v in VOICES}
    confusions = {v: Counter() for v in VOICES}
    rows = []
    skipped = 0

    for k, (t, r) in enumerate(sample, 1):
        rec = tables[t].slice(r, 1).to_pylist()[0]
        try:
            audio = _decode_mp3(rec["audio"]["bytes"])
        except Exception:
            skipped += 1
            continue
        if audio.size < 16000 * 0.3:
            skipped += 1
            continue

        inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
        with torch.no_grad():
            logits = model(inputs.input_values).logits
        hyp = _phones(processor.batch_decode(torch.argmax(logits, dim=-1))[0], special)

        row = {"path": rec["path"], "sentence": rec["sentence"], "accent": rec["accent"] or "", "hyp": " ".join(hyp)}
        for v in VOICES:
            ref = _phones(tok.phonemize(rec["sentence"], phonemizer_lang=v), special)
            s, d, i, pairs = _edit_ops(ref, hyp)
            totals[v].update(ref=len(ref), sub=s, dele=d, ins=i)
            confusions[v].update(f"{a}→{b}" for a, b in pairs)
            row[f"ref_{v}"] = " ".join(ref)
            row[f"per_{v}"] = round((s + d + i) / max(len(ref), 1), 4)
        rows.append(row)

        if k % 50 == 0:
            live = {v: round(100 * (c["sub"] + c["dele"] + c["ins"]) / max(c["ref"], 1), 2) for v, c in totals.items()}
            print(f"{k}/{len(sample)}  PER so far: {live}")

    summary = {
        "model": MODEL_ID,
        "dataset": f"{DATASET_REPO} (Common Voice 17.0, es, test)",
        "n_requested": n,
        "n_scored": len(rows),
        "n_skipped": skipped,
        "seed": seed,
        "voices": {},
    }
    for v in VOICES:
        c = totals[v]
        errs = c["sub"] + c["dele"] + c["ins"]
        per_clip = sorted(r[f"per_{v}"] for r in rows)
        summary["voices"][v] = {
            "per_percent": round(100 * errs / max(c["ref"], 1), 2),
            "median_clip_per_percent": round(100 * per_clip[len(per_clip) // 2], 2) if per_clip else None,
            "ref_phones": c["ref"],
            "substitutions": c["sub"],
            "deletions": c["dele"],
            "insertions": c["ins"],
            "top_substitutions": confusions[v].most_common(15),
        }
    return {"summary": summary, "rows": rows}


@app.local_entrypoint()
def main(n: int = 500, seed: int = 0):
    result = evaluate.remote(n, seed)
    summary, rows = result["summary"], result["rows"]

    out_dir = Path(__file__).parent / "eval"
    out_dir.mkdir(exist_ok=True)
    stem = f"cv_es_{MODEL_ID.split('/')[-1]}_n{n}_seed{seed}"
    (out_dir / f"{stem}.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    with open(out_dir / f"{stem}.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["path"])
        writer.writeheader()
        writer.writerows(rows)

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nwrote {out_dir / stem}.json / .csv")
