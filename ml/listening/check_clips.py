"""
Quality gate for the Listening clips: does each recording sound closer to the
word the learner is supposed to hear than to its look-alike distractor?

Runs every clip through the phoneme recogniser from ml/pronunciation (the same
wav2vec2 model the Speaking page uses) in a throwaway Modal container, scores
what it heard against the target text and against the distractor, and writes
ml/listening/qc_report.json. Items where the DISTRACTOR scored higher are the
ones to drop — add their text to "excludeTargets" in overrides.json, then
re-run build_items.py and generate_clips.py.

The recogniser is noisy on very short words, so a "miss" can be the model's
fault rather than the voice's, but dropping those items is the safe choice.

Usage (repo root; needs a Modal login):
    modal run ml/listening/check_clips.py
"""

import json
import sys
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "pronunciation"))
import modal_app  # noqa: E402

REPORT = Path(__file__).resolve().parent / "qc_report.json"

image = modal_app.image.add_local_python_source("modal_app")
app = modal.App("listening-clip-qc", image=image)


@app.function(timeout=1800)
def score_clips(rows: list):
    import modal_app as m

    out = []
    for r in rows:
        spoken = m._recognise_phones(m._decode_audio(r["mp3"], "audio/mpeg"))
        out.append(
            {
                "text": r["text"],
                "distractor": r["distractor"],
                "heard": "".join(spoken),
                "target_score": m._assess(r["text"], spoken)["score"],
                "distractor_score": m._assess(r["distractor"], spoken)["score"],
            }
        )
    return out


@app.local_entrypoint()
def main():
    items = json.loads((ROOT / "data" / "listening" / "items.json").read_text(encoding="utf-8"))
    rows, seen = [], set()
    for i in items:
        if i["clip"] in seen:
            continue
        seen.add(i["clip"])
        mp3 = (ROOT / "assets" / "listening" / f"{i['clip']}.mp3").read_bytes()
        rows.append({"text": i["text"], "distractor": i["distractor"], "mp3": mp3})

    res = score_clips.remote(rows)
    REPORT.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")

    n = len(res)
    wins = sum(r["target_score"] > r["distractor_score"] for r in res)
    misses = [r for r in res if r["target_score"] < r["distractor_score"]]
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"{n} clips: {wins} closer to the target, {n - wins - len(misses)} tied, {len(misses)} closer to the distractor")
    for r in misses:
        print(f'  DROP? "{r["text"]}" vs "{r["distractor"]}"  heard {r["heard"]}  ({r["target_score"]} vs {r["distractor_score"]})')
