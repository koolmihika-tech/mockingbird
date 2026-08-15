"""
Bootstraps the priority-score weights (weakness, forgetting decay, confidence,
struggle flag) used to pick which topic/category to serve next in practice.

lesson_history is empty in production, so this simulates a population of
synthetic learners with a hidden mastery state per (topic, category) that
grows with correct practice and decays over time (Ebbinghaus-style
forgetting), then fits a logistic regression that predicts whether the next
attempt will be wrong from the same four features the app can actually
observe (see priority_features.py — refit_on_real_data.py shares that same
feature/fit code so the two can never drift apart).

This only encodes the assumptions baked into the simulator below (forgetting
curve shape, learning rate, noise) — treat the weights it prints as a
starting point, not ground truth. Once Supabase's lesson_history has a few
hundred real attempts, run refit_on_real_data.py and compare.

Usage: python ml/simulate_and_fit_weights.py
"""

import json
import math
import random
from pathlib import Path

import numpy as np
import pandas as pd

from priority_features import (
    BASE_HALF_LIFE_DAYS,
    HALF_LIFE_GROWTH,
    QUESTIONS_PER_CATEGORY,
    Attempt,
    compute_features,
    fit_weights,
    print_metrics,
    print_weights,
    weights_from_model,
)

SEED = 42

# --- simulation size ---
NUM_USERS = 400
NUM_TOPICS = 16  # matches LESSON_SUBCATEGORIES in data/lessonQuestions.ts
CATEGORIES = ["grammar", "vocab"]
SIM_DAYS = 150
SESSIONS_PER_USER_MEAN = 150  # ~1/day; each session revisits 1-2 topics, not always a fresh one
TOPICS_PER_SESSION = (1, 2)

# --- learning/forgetting dynamics (hidden — not visible to compute_features) ---
LEARNING_RATE = 0.25  # how much mastery grows per correct rep
DIFFICULTY_STEEPNESS = 5.0  # how sharply P(correct) responds to mastery vs difficulty
BASE_TIME_PER_Q_SEC = 12.0

OUTPUT_PATH = Path(__file__).parent / "learned_weights.json"


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def simulate_events(rng: random.Random, np_rng: np.random.Generator) -> list[dict]:
    """Runs the hidden-state simulation and returns one training row per
    attempt that has at least one prior attempt to compute features from."""
    rows = []

    for user_id in range(NUM_USERS):
        # per-user variation: how often they practice, and their overall aptitude
        session_count = np_rng.poisson(lam=SESSIONS_PER_USER_MEAN)
        session_days = sorted(np_rng.integers(1, SIM_DAYS + 1, size=session_count).tolist())
        user_aptitude = np_rng.normal(loc=0.0, scale=0.1)

        state: dict[tuple[int, str], dict] = {}
        for topic_id in range(NUM_TOPICS):
            for category in CATEGORIES:
                state[(topic_id, category)] = {
                    "mastery": min(0.9, max(0.1, np_rng.uniform(0.35, 0.55) + user_aptitude)),
                    "half_life": BASE_HALF_LIFE_DAYS,
                    "difficulty": np_rng.uniform(0.25, 0.55),
                    "last_day": None,
                    "history": [],  # list[Attempt]
                }

        for day in session_days:
            num_topics_today = rng.randint(*TOPICS_PER_SESSION)
            topics_today = rng.sample(range(NUM_TOPICS), k=min(num_topics_today, NUM_TOPICS))
            for topic_id in topics_today:
                for category in CATEGORIES:
                    row = simulate_one_attempt(np_rng, state[(topic_id, category)], user_id, topic_id, category, day)
                    if row is not None:
                        rows.append(row)

    return rows


def simulate_one_attempt(np_rng, s: dict, user_id: int, topic_id: int, category: str, day: int) -> dict | None:
    if s["last_day"] is None:
        mastery_now = s["mastery"]
    else:
        days_gap = day - s["last_day"]
        mastery_now = s["mastery"] * math.exp(-days_gap / s["half_life"])

    p_correct = sigmoid(DIFFICULTY_STEEPNESS * (mastery_now - s["difficulty"]))
    correct = bool(np_rng.random() < p_correct)

    noise = np_rng.lognormal(mean=0.0, sigma=0.25)
    time_taken = BASE_TIME_PER_Q_SEC * QUESTIONS_PER_CATEGORY * (1.8 - mastery_now) * noise
    time_taken = max(5.0 * QUESTIONS_PER_CATEGORY, time_taken)

    # emit a training row using only history BEFORE this attempt — the same
    # compute_features() that refit_on_real_data.py calls on real rows
    prior: list[Attempt] = s["history"]
    row = None
    if len(prior) >= 1:
        features = compute_features(prior, current_day=day)
        row = {
            **features,
            "user_id": user_id,
            "topic_id": topic_id,
            "category": category,
            "label_incorrect": 0 if correct else 1,
        }

    # update hidden state (learning/forgetting dynamics)
    if correct:
        s["half_life"] *= HALF_LIFE_GROWTH
        s["mastery"] = min(1.0, mastery_now + LEARNING_RATE * (1 - mastery_now))
    else:
        s["half_life"] = max(BASE_HALF_LIFE_DAYS * 0.5, s["half_life"] * 0.85)
        s["mastery"] = mastery_now
    s["last_day"] = day
    s["history"].append(Attempt(day=day, passed=correct, time_per_q_sec=time_taken / QUESTIONS_PER_CATEGORY))

    return row


def main():
    rng = random.Random(SEED)
    np_rng = np.random.default_rng(SEED)

    print(f"Simulating {NUM_USERS} users over {SIM_DAYS} days...")
    rows = simulate_events(rng, np_rng)
    df = pd.DataFrame(rows)
    print(f"Generated {len(df)} training rows from {df['user_id'].nunique()} users.")

    model, metrics = fit_weights(df, seed=SEED)
    if model is None:
        print(f"Could not fit a model: {metrics.get('error')}")
        return

    weights = weights_from_model(model)
    print_weights(weights)
    print_metrics(metrics)

    OUTPUT_PATH.write_text(json.dumps({"weights": weights, "metrics": metrics}, indent=2))
    print(f"\nWrote weights to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
