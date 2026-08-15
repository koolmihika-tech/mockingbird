"""
Pulls real attempts from Supabase's Mockingbird.lesson_history and reshapes
them into the same (user, topic, category) attempt sequences that
priority_features.build_rows_from_group expects.

Needs SUPABASE_SERVICE_ROLE_KEY — the anon key the app ships with is
RLS-restricted to one user's own rows, but training needs every user's
history. Never put the service role key in the Expo app or commit it; keep
it out of EXPO_PUBLIC_* so it can't accidentally end up in the client bundle.

Reads from a .env at the repo root (same file the Expo app already uses):
  SUPABASE_URL                 # falls back to EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY    # required, get from Supabase project settings
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client
from supabase.lib.client_options import ClientOptions

from priority_features import PASSING_SCORE, QUESTIONS_PER_CATEGORY, Attempt

PAGE_SIZE = 1000
REPO_ROOT = Path(__file__).resolve().parent.parent


def get_client() -> Client:
    load_dotenv(REPO_ROOT / ".env")

    url = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "Set SUPABASE_URL (or reuse EXPO_PUBLIC_SUPABASE_URL) and "
            "SUPABASE_SERVICE_ROLE_KEY in .env before running this - the "
            "service role key is required to read every user's rows."
        )
    return create_client(url, key, options=ClientOptions(schema="Mockingbird"))


def fetch_raw_rows(client: Client) -> list[dict]:
    """Pages through lesson_history — PostgREST caps a single response at
    1000 rows by default."""
    rows: list[dict] = []
    start = 0
    while True:
        resp = (
            client.table("lesson_history")
            .select("user_id, lesson_id, created_at, grammar_time, vocab_time, grammar_accuracy, vocab_accuracy")
            .order("user_id")
            .order("created_at")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
        )
        page = resp.data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return rows


def to_attempt_groups(raw_rows: list[dict]) -> dict[tuple, list[Attempt]]:
    """Reshapes each raw row (one grammar+vocab attempt pair) into two
    independent attempt sequences, keyed by (user_id, lesson_id, category) —
    mirrors how the app UI always attempts both categories together per
    topic, but each category has its own mastery/forgetting track."""
    groups: dict[tuple, list[Attempt]] = {}

    for row in raw_rows:
        user_id = row.get("user_id")
        lesson_id = row.get("lesson_id")
        created_at = row.get("created_at")
        if not user_id or not lesson_id or not created_at:
            continue  # rows inserted before lesson_id/created_at existed

        day = _to_day_number(created_at)

        for category, time_col, accuracy_col in [
            ("grammar", "grammar_time", "grammar_accuracy"),
            ("vocab", "vocab_time", "vocab_accuracy"),
        ]:
            time_sec = row.get(time_col)
            accuracy = row.get(accuracy_col)
            if time_sec is None or accuracy is None:
                continue

            key = (user_id, lesson_id, category)
            groups.setdefault(key, []).append(
                Attempt(
                    day=day,
                    passed=accuracy >= PASSING_SCORE,
                    time_per_q_sec=time_sec / QUESTIONS_PER_CATEGORY,
                )
            )

    # each group must be chronological for compute_features' streak/recency logic
    for key, attempts in groups.items():
        attempts.sort(key=lambda a: a.day)

    return groups


def _to_day_number(timestamp_str: str) -> float:
    from datetime import datetime, timezone

    ts = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.timestamp() / 86400.0


def fetch_attempt_groups() -> dict[tuple, list[Attempt]]:
    client = get_client()
    raw_rows = fetch_raw_rows(client)
    return to_attempt_groups(raw_rows)
