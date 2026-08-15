"""
Shared feature engineering + model fitting for the practice-priority score.
Imported by both simulate_and_fit_weights.py (synthetic bootstrap) and
refit_on_real_data.py (real lesson_history) so the two never drift apart —
the whole point is that the real refit uses the exact same four features.
"""

import math
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit

FEATURE_COLS = ["weakness", "forgetting_decay", "confidence", "struggle_flag"]

QUESTIONS_PER_CATEGORY = 4  # matches lessonQuestions.ts: 4 grammar + 4 vocab per topic

# An attempt "passes" a category at the same bar the app already uses to mark
# a lesson complete (Supabase/services/activityHistory.ts PASSING_SCORE).
PASSING_SCORE = 70

EMA_ALPHA = 0.3
BASE_HALF_LIFE_DAYS = 10.0  # how many days a fresh memory survives before ~50% decay
HALF_LIFE_GROWTH = 1.4  # each passed attempt makes the memory stick longer
CONFIDENCE_SATURATION_N = 8  # attempts after which "confidence" maxes out
EXPECTED_TIME_PER_Q_SEC = 15.0  # placeholder normalizer; recalibrate once real timing data exists


@dataclass
class Attempt:
    day: float  # any monotonically increasing time coordinate, in days
    passed: bool
    time_per_q_sec: float


def compute_features(prior: list[Attempt], current_day: float) -> dict:
    """Features for the attempt happening at current_day, computed only from
    attempts strictly before it — this is what production code would have
    available when deciding what to serve next, so it's also all the real
    refit script is allowed to use."""
    n_prior = len(prior)

    ema = float(prior[0].passed)
    for a in prior[1:]:
        ema = EMA_ALPHA * float(a.passed) + (1 - EMA_ALPHA) * ema
    weakness = 1 - ema

    # True memory half-life is never observable, in the simulator or in
    # production, so this estimates it the same way either would have to: a
    # longer current streak of passes implies a longer-lasting memory.
    streak = 0
    for a in reversed(prior):
        if not a.passed:
            break
        streak += 1
    estimated_half_life = BASE_HALF_LIFE_DAYS * (HALF_LIFE_GROWTH**streak)
    days_since_last = max(0.0, current_day - prior[-1].day)
    forgetting_decay = 1 - math.exp(-days_since_last / estimated_half_life)

    confidence = min(n_prior / CONFIDENCE_SATURATION_N, 1.0)

    avg_time_per_q = sum(a.time_per_q_sec for a in prior) / n_prior
    struggle_flag = (avg_time_per_q / EXPECTED_TIME_PER_Q_SEC) * weakness

    return {
        "weakness": weakness,
        "forgetting_decay": forgetting_decay,
        "confidence": confidence,
        "struggle_flag": struggle_flag,
    }


def build_rows_from_group(group_key: tuple, attempts: list[Attempt]) -> list[dict]:
    """Walks one (user, topic, category) attempt sequence chronologically and
    emits one training row per attempt that has prior history to learn from."""
    rows = []
    for i in range(1, len(attempts)):
        prior = attempts[:i]
        current = attempts[i]
        features = compute_features(prior, current.day)
        rows.append(
            {
                **features,
                "label_incorrect": 0 if current.passed else 1,
                "group_key": group_key,
            }
        )
    return rows


def fit_weights(
    df: pd.DataFrame,
    group_col: str = "user_id",
    label_col: str = "label_incorrect",
    seed: int = 42,
    test_size: float = 0.2,
    min_rows: int = 200,
    min_users_per_split: int = 5,
) -> tuple[LogisticRegression | None, dict]:
    """Fits priority_score = w.features + b via logistic regression on
    label_incorrect. Returns (None, {"error": ...}) instead of fitting
    garbage when there isn't enough data yet to hold out a meaningful test
    set or when every row shares one label (no signal to learn from)."""
    if len(df) < min_rows:
        return None, {"error": f"only {len(df)} rows (need >= {min_rows}) - collect more lesson_history first"}

    y_all = df[label_col].to_numpy()
    if len(set(y_all.tolist())) < 2:
        return None, {"error": "all rows share one label - can't fit a classifier yet"}

    n_users = df[group_col].nunique()
    X = df[FEATURE_COLS].to_numpy()
    y = y_all

    if n_users < min_users_per_split:
        # too few distinct users/groups for a held-out split to mean anything;
        # fit on everything and report in-sample metrics, clearly labeled
        model = LogisticRegression(max_iter=1000)
        model.fit(X, y)
        pred = model.predict(X)
        proba = model.predict_proba(X)[:, 1]
        metrics = {
            "warning": f"only {n_users} distinct {group_col} values - metrics below are in-sample, not held-out",
            "rows": int(len(df)),
            "accuracy": float(accuracy_score(y, pred)),
            "roc_auc": float(roc_auc_score(y, proba)) if len(set(y.tolist())) > 1 else None,
            "base_rate_incorrect": float(y.mean()),
        }
        return model, metrics

    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    train_idx, test_idx = next(splitter.split(X, y, groups=df[group_col]))

    model = LogisticRegression(max_iter=1000)
    model.fit(X[train_idx], y[train_idx])

    test_pred = model.predict(X[test_idx])
    test_proba = model.predict_proba(X[test_idx])[:, 1]
    metrics = {
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "test_accuracy": float(accuracy_score(y[test_idx], test_pred)),
        "test_roc_auc": float(roc_auc_score(y[test_idx], test_proba)),
        "base_rate_incorrect": float(y.mean()),
    }
    return model, metrics


def weights_from_model(model: LogisticRegression) -> dict:
    weights = dict(zip(FEATURE_COLS, model.coef_[0].tolist()))
    weights["intercept"] = float(model.intercept_[0])
    return weights


def print_weights(weights: dict):
    print("\nWeights (priority_score = w.x + intercept; higher = practice sooner):")
    for name, value in weights.items():
        print(f"  {name:>17}: {value:+.4f}")


def print_metrics(metrics: dict):
    print("\nEvaluation:")
    for name, value in metrics.items():
        if isinstance(value, float):
            print(f"  {name:>17}: {value:.4f}")
        else:
            print(f"  {name:>17}: {value}")
