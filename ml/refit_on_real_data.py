"""
Refits the practice-priority weights on real Supabase lesson_history data,
using the exact same features and fitting code as the synthetic bootstrap
(simulate_and_fit_weights.py) — see priority_features.py.

Usage: python ml/refit_on_real_data.py
Needs .env: SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.

Safe to run repeatedly as more lesson_history accumulates — it always refits
from scratch on the full history, it doesn't incrementally update.
"""

import json
from pathlib import Path

import pandas as pd

from fetch_lesson_history import fetch_attempt_groups
from priority_features import build_rows_from_group, fit_weights, print_metrics, print_weights, weights_from_model

OUTPUT_PATH = Path(__file__).parent / "learned_weights_real.json"
SYNTHETIC_WEIGHTS_PATH = Path(__file__).parent / "learned_weights.json"


def main():
    print("Fetching lesson_history from Supabase...")
    groups = fetch_attempt_groups()
    n_attempts = sum(len(attempts) for attempts in groups.values())
    print(f"Found {n_attempts} attempts across {len(groups)} (user, lesson, category) sequences.")

    rows = []
    for group_key, attempts in groups.items():
        for row in build_rows_from_group(group_key, attempts):
            user_id, lesson_id, category = row.pop("group_key")
            row["user_id"] = user_id
            row["lesson_id"] = lesson_id
            row["category"] = category
            rows.append(row)

    if not rows:
        print(
            "No rows with at least one prior attempt yet — every sequence "
            "found is a single first-time attempt. Nothing to fit until "
            "users start repeating lessons."
        )
        return

    df = pd.DataFrame(rows)
    print(f"Built {len(df)} feature rows from {df['user_id'].nunique()} users.")

    model, metrics = fit_weights(df)
    if model is None:
        print(f"Could not fit a model yet: {metrics.get('error')}")
        return

    weights = weights_from_model(model)
    print_weights(weights)
    print_metrics(metrics)

    OUTPUT_PATH.write_text(json.dumps({"weights": weights, "metrics": metrics}, indent=2))
    print(f"\nWrote weights to {OUTPUT_PATH}")

    if SYNTHETIC_WEIGHTS_PATH.exists():
        synthetic = json.loads(SYNTHETIC_WEIGHTS_PATH.read_text())["weights"]
        print("\nReal-data weights vs. synthetic bootstrap:")
        for name in weights:
            print(f"  {name:>17}: real {weights[name]:+.4f}   synthetic {synthetic.get(name, float('nan')):+.4f}")


if __name__ == "__main__":
    main()
