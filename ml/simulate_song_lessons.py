"""
Synthetic dataset generator for a *struggle* model scoped to song lessons.

Where simulate_and_fit_weights.py bootstraps the four priority-score weights
from a whole population, this script does something narrower and more
literal: it walks one (or more) simulated learners through every real song
lesson five times each and records, question by question, how long they took
and whether they got it right — the raw material for training a model that
predicts a learner's level of struggle by question type and by topic.

What a "song lesson" is (see app/songs/[id].tsx + components/SongPracticeScreen.tsx):
  - Reading  session -> generateQuestions(..., "reading")  ~5 questions,
    mostly "multiple_choice" with some "fill_blank"  (auto-graded)
  - Writing  session -> generateQuestions(..., "writing")  ~5 "short_answer"
    prompts. Not auto-gradable, so the app always scores them correct
    (components/QuestionCards.tsx ShortAnswerCard) — struggle there shows up
    as time-on-task, not wrong answers, and the dataset reflects that.
  All song questions are vocab-category (no grammar/vocab split), so each
  session logs one vocab attempt against the song's data/songs.ts historyId.

Placeholder songs (data/songs.ts displayName === "Placeholder", ids 7-10)
are excluded, matching the request.

The hidden learning/forgetting dynamics mirror simulate_and_fit_weights.py
(logistic P(correct) in skill - difficulty, Ebbinghaus decay between spaced
sessions, multiplicative log-normal time noise) so the two simulators tell a
consistent story. Treat the output as a starting point shaped by those
assumptions, not ground truth — retrain on real lesson_history once it fills
in (ml/refit_on_real_data.py is the template).

Usage:
  python ml/simulate_song_lessons.py                # 1 learner, the literal ask
  python ml/simulate_song_lessons.py --learners 200 # a trainable-size dataset

Outputs (written next to this file):
  song_lesson_attempts.csv      one row per question attempt (train on this)
  song_lesson_by_topic.csv      time + correct/incorrect aggregated by topic
  song_lesson_by_topic_type.csv same, split by question type
  song_lesson_sessions.csv      lesson_history-shaped rows (one per session)
"""

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from priority_features import BASE_HALF_LIFE_DAYS, HALF_LIFE_GROWTH, PASSING_SCORE

SEED = 42
ML_DIR = Path(__file__).parent
REPO_ROOT = ML_DIR.parent
VOCAB_PATH = REPO_ROOT / "data" / "vocabulary.json"

REPEATS_PER_SONG = 5          # "go through a song lesson five times for each song"
QUESTIONS_PER_SESSION = 5     # generateQuestions default count
DAYS_BETWEEN_REPEATS = (1, 4) # spaced repetition gap, inclusive range

# Real songs only — data/songs.ts, ids 7-10 are displayName "Placeholder".
# level is Song.level ("1" easier / "2" harder).
SONGS = [
    {"id": "1", "historyId": "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a01", "name": "Vivir Mi Vida",   "artist": "Marc Anthony",                 "level": 1},
    {"id": "2", "historyId": "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a02", "name": "Me Gustas Tú",     "artist": "Mano Chao",                    "level": 1},
    {"id": "3", "historyId": "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a03", "name": "Limón y Sal",      "artist": "Julieta Venegas",              "level": 2},
    {"id": "4", "historyId": "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a04", "name": "Mejor Que Ayer",   "artist": "Diego Torres",                 "level": 2},
    {"id": "5", "historyId": "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a05", "name": "Robarte un Beso",  "artist": "Carlos Vives Sebastián Yatra", "level": 2},
    {"id": "6", "historyId": "6a1e6b1a-0b1b-4b9e-9a5d-1f9c6e2a1a06", "name": "La Libertad",      "artist": "Álvaro Soler",                 "level": 1},
]

# --- question-type profiles -------------------------------------------------
# skill_bonus  : how much easier this format is to get right, all else equal
# difficulty   : the bar in the logistic P(correct) = sigmoid(k*(skill - diff))
# base_time_sec: unhurried time on the format at full skill
# min_time_sec : nobody answers faster than this
# auto_graded  : short_answer is revealed, not graded -> always "correct"
QUESTION_TYPES = {
    "multiple_choice": {"skill_bonus": 0.12, "difficulty": 0.35, "base_time_sec": 10.0, "min_time_sec": 3.0, "auto_graded": True},
    "fill_blank":      {"skill_bonus": -0.02, "difficulty": 0.50, "base_time_sec": 16.0, "min_time_sec": 5.0, "auto_graded": True},
    "short_answer":    {"skill_bonus": 0.00, "difficulty": 0.55, "base_time_sec": 28.0, "min_time_sec": 8.0, "auto_graded": False},
}

# reading sessions are "prefer multiple_choice ... some may be fill_blank"
P_FILL_BLANK_IN_READING = 0.25

DIFFICULTY_STEEPNESS = 5.0  # matches simulate_and_fit_weights.py
LEARNING_RATE = 0.25        # matches simulate_and_fit_weights.py
TIME_NOISE_SIGMA = 0.30


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def load_vocab_sizes() -> dict[str, int]:
    data = json.loads(VOCAB_PATH.read_text(encoding="utf-8"))
    return {name: len(words) for name, words in data.items()}


def base_skill(rng: np.random.Generator, song: dict, vocab_size: int, qtype: str, aptitude: float) -> float:
    """Starting skill for a (song, question-type) track before any practice."""
    level_bonus = 0.08 if song["level"] == 1 else -0.06
    # a bigger song vocabulary means more unfamiliar target words to field
    vocab_penalty = -(vocab_size - 60) / 400.0
    qtype_bonus = QUESTION_TYPES[qtype]["skill_bonus"]
    jitter = rng.normal(0.0, 0.05)
    return float(np.clip(0.5 + aptitude + level_bonus + vocab_penalty + qtype_bonus + jitter, 0.1, 0.92))


def decayed(skill: float, half_life: float, days_gap: float) -> float:
    return skill * math.exp(-days_gap / half_life)


def simulate_learner(rng: np.random.Generator, learner_id: int, vocab_sizes: dict[str, int]) -> tuple[list[dict], list[dict]]:
    """One learner through all 6 song lessons x 5 repeats. Returns
    (attempt_rows, session_rows)."""
    aptitude = float(rng.normal(0.0, 0.12))
    # a small per-learner writing-fluency offset — some people freeze on
    # open-ended production regardless of how well they know the words
    writing_offset = float(rng.normal(0.0, 0.06))

    attempts: list[dict] = []
    sessions: list[dict] = []

    for song in SONGS:
        vocab_size = vocab_sizes.get(song["name"], 80)
        # one hidden track per question type: {skill, half_life}
        tracks = {
            qt: {"skill": base_skill(rng, song, vocab_size, qt, aptitude), "half_life": BASE_HALF_LIFE_DAYS}
            for qt in QUESTION_TYPES
        }
        day = float(rng.integers(0, 5))

        for rep in range(1, REPEATS_PER_SONG + 1):
            if rep > 1:
                day += float(rng.integers(DAYS_BETWEEN_REPEATS[0], DAYS_BETWEEN_REPEATS[1] + 1))

            for mode in ("reading", "writing"):
                if mode == "reading":
                    q_types = [
                        "fill_blank" if rng.random() < P_FILL_BLANK_IN_READING else "multiple_choice"
                        for _ in range(QUESTIONS_PER_SESSION)
                    ]
                else:
                    q_types = ["short_answer"] * QUESTIONS_PER_SESSION

                session_correct = 0
                session_time = 0.0

                for q_index, qtype in enumerate(q_types):
                    prof = QUESTION_TYPES[qtype]
                    track = tracks[qtype]

                    skill_now = decayed(track["skill"], track["half_life"], 0.0 if rep == 1 else day - track["_last_day"]) \
                        if "_last_day" in track else track["skill"]
                    skill_now = float(np.clip(skill_now, 0.02, 0.99))

                    if qtype == "short_answer":
                        # revealed, never marked wrong (QuestionCards ShortAnswerCard)
                        correct = True
                        effective_skill = float(np.clip(skill_now + writing_offset, 0.02, 0.99))
                    else:
                        p_correct = sigmoid(DIFFICULTY_STEEPNESS * (skill_now - prof["difficulty"]))
                        correct = bool(rng.random() < p_correct)
                        effective_skill = skill_now

                    noise = float(rng.lognormal(mean=0.0, sigma=TIME_NOISE_SIGMA))
                    time_sec = prof["base_time_sec"] * (1.8 - effective_skill) * noise
                    time_sec = max(prof["min_time_sec"], round(time_sec, 1))

                    session_correct += int(correct)
                    session_time += time_sec

                    attempts.append({
                        "learner_id": learner_id,
                        "song_id": song["id"],
                        "topic": song["name"],
                        "artist": song["artist"],
                        "song_level": song["level"],
                        "vocab_size": vocab_size,
                        "session_repeat": rep,
                        "day": round(day, 1),
                        "mode": mode,
                        "question_index": q_index,
                        "question_type": qtype,
                        "category": "vocab",
                        "auto_graded": prof["auto_graded"],
                        "correct": int(correct),
                        "incorrect": int(not correct),
                        "time_sec": time_sec,
                    })

                    # learning + forgetting update on the hidden track
                    if correct:
                        track["skill"] = float(np.clip(skill_now + LEARNING_RATE * (1 - skill_now), 0.0, 1.0))
                        track["half_life"] *= HALF_LIFE_GROWTH
                    else:
                        track["skill"] = skill_now
                        track["half_life"] = max(BASE_HALF_LIFE_DAYS * 0.5, track["half_life"] * 0.85)
                    track["_last_day"] = day

                accuracy = round(100 * session_correct / len(q_types))
                sessions.append({
                    "user_id": f"sim-learner-{learner_id:04d}",
                    "lesson_id": song["historyId"],
                    "topic": song["name"],
                    "song_level": song["level"],
                    "session_repeat": rep,
                    "day": round(day, 1),
                    "mode": mode,
                    "grammar_time": None,           # song sessions have no grammar split
                    "vocab_time": round(session_time),
                    "grammar_accuracy": None,
                    "vocab_accuracy": accuracy,
                    "total_accuracy": accuracy,
                    "questions": len(q_types),
                    "questions_correct": session_correct,
                    "questions_incorrect": len(q_types) - session_correct,
                    "passed": accuracy >= PASSING_SCORE,
                })

    return attempts, sessions


def aggregate_by_topic(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(["topic", "song_level"], as_index=False).agg(
        sessions=("session_repeat", lambda s: s.nunique() * 2),  # reading + writing per repeat
        questions=("correct", "size"),
        questions_correct=("correct", "sum"),
        questions_incorrect=("incorrect", "sum"),
        total_time_sec=("time_sec", "sum"),
        avg_time_per_q_sec=("time_sec", "mean"),
    )
    graded = df[df["auto_graded"]]
    acc = graded.groupby("topic")["correct"].mean().mul(100).round(1).rename("graded_accuracy_pct")
    g = g.merge(acc, on="topic", how="left")
    g["avg_time_per_q_sec"] = g["avg_time_per_q_sec"].round(1)
    g["total_time_sec"] = g["total_time_sec"].round().astype(int)
    return g.sort_values(["song_level", "topic"]).reset_index(drop=True)


def aggregate_by_topic_type(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(["topic", "song_level", "question_type"], as_index=False).agg(
        questions=("correct", "size"),
        questions_correct=("correct", "sum"),
        questions_incorrect=("incorrect", "sum"),
        total_time_sec=("time_sec", "sum"),
        avg_time_per_q_sec=("time_sec", "mean"),
    )
    g["accuracy_pct"] = (100 * g["questions_correct"] / g["questions"]).round(1)
    g["avg_time_per_q_sec"] = g["avg_time_per_q_sec"].round(1)
    g["total_time_sec"] = g["total_time_sec"].round().astype(int)
    return g.sort_values(["song_level", "topic", "question_type"]).reset_index(drop=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--learners", type=int, default=1, help="number of simulated learners (default 1)")
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--out-prefix", default="song_lesson", help="filename prefix for the 4 CSVs (default 'song_lesson')")
    args = parser.parse_args()

    try:
        sys.stdout.reconfigure(encoding="utf-8")  # song titles carry accents
    except Exception:
        pass

    rng = np.random.default_rng(args.seed)
    vocab_sizes = load_vocab_sizes()

    all_attempts: list[dict] = []
    all_sessions: list[dict] = []
    for learner_id in range(args.learners):
        a, s = simulate_learner(rng, learner_id, vocab_sizes)
        all_attempts.extend(a)
        all_sessions.extend(s)

    attempts_df = pd.DataFrame(all_attempts)
    sessions_df = pd.DataFrame(all_sessions)
    by_topic = aggregate_by_topic(attempts_df)
    by_topic_type = aggregate_by_topic_type(attempts_df)

    p = args.out_prefix
    attempts_df.to_csv(ML_DIR / f"{p}_attempts.csv", index=False)
    sessions_df.to_csv(ML_DIR / f"{p}_sessions.csv", index=False)
    by_topic.to_csv(ML_DIR / f"{p}_by_topic.csv", index=False)
    by_topic_type.to_csv(ML_DIR / f"{p}_by_topic_type.csv", index=False)

    print(f"Learners: {args.learners}   Songs: {len(SONGS)}   Repeats/song: {REPEATS_PER_SONG}")
    print(f"Question attempts: {len(attempts_df)}   Sessions: {len(sessions_df)}\n")

    print("=== Time and questions correct/incorrect by topic ===")
    with pd.option_context("display.max_columns", None, "display.width", 200):
        print(by_topic.to_string(index=False))

    print("\n=== By topic x question type ===")
    with pd.option_context("display.max_columns", None, "display.width", 200):
        print(by_topic_type.to_string(index=False))

    print("\n=== Overall struggle signal by question type ===")
    overall = attempts_df.groupby("question_type").agg(
        questions=("correct", "size"),
        accuracy_pct=("correct", lambda s: round(100 * s.mean(), 1)),
        avg_time_sec=("time_sec", lambda s: round(s.mean(), 1)),
    )
    print(overall.to_string())

    print(f"\nWrote 4 CSVs ({p}_*.csv) to {ML_DIR}")


if __name__ == "__main__":
    main()
