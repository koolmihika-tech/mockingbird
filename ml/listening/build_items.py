"""
Build the question bank for the song Listening exercise.

Each item is a word or short (2-5 word) phrase from a song plus ONE look-alike
distractor, so the learner hears the audio and picks which of two written
options they heard (e.g. "coro" vs "corso").

Words come from data/vocabulary.json; phrases come from the song's lyrics
(lrclib, cached locally in ml/listening/cache, which is gitignored).

Distractors are real Spanish words (pyspellchecker's frequency dictionary)
that differ from the target by exactly ONE SOUND. Sounds are compared with a
Latin American (es-MX) phonetic key so we never pair homophones: b/v, c/s/z,
ll/y, silent h, g/j before e/i all sound identical there and are rejected.
Accent-only pairs (habló / hablo) are skipped too — stress is too easy for a
TTS voice to blur.

Usage (from the repo root):
    python ml/listening/build_items.py            # writes data/listening/items.json
    python ml/listening/build_items.py --review   # also prints every pair
Then:
    python ml/listening/generate_clips.py         # synthesises the audio

Hand edits go in ml/listening/overrides.json:
    {"exclude": ["word", ...], "distractors": {"word": "otherword"},
     "excludePhrases": ["whole phrase", ...], "excludeTargets": ["word or phrase", ...]}
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

from spellchecker import SpellChecker

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / "cache"
OVERRIDES = Path(__file__).resolve().parent / "overrides.json"
OUT = ROOT / "data" / "listening" / "items.json"

WORDS_PER_SONG = 15
PHRASES_PER_SONG = 5
MIN_WORD_LEN, MAX_WORD_LEN = 4, 10
# Both the target and its distractor must be at least this common in the
# dictionary, so neither option is an obscure or garbage "word".
MIN_FREQ = 300
MIN_SHORT_FREQ = 2000  # 3-letter distractors must be everyday words
MAX_PHRASE_WORDS = 5
ALPHABET = "abcdefghijklmnopqrstuvwxyzñáéíóú"

# Words that make poor listening practice: articles, pronouns, determiners,
# prepositions, conjunctions, auxiliaries, indefinites, and lyric filler
# ("la la la", "oh", "ay"). Compared accent-free. Only content words become
# questions, and a phrase needs at least two of them.
STOPWORDS = set(
    """el la los las un una unos unas lo al del
    yo tu el ella ello nosotros nosotras vosotros ellos ellas usted ustedes
    me te se nos os le les mi ti si conmigo contigo consigo
    mi mis tus su sus nuestro nuestra nuestros nuestras vuestro vuestra vuestros vuestras
    este esta esto estos estas ese esa eso esos esas aquel aquella aquello aquellos aquellas
    a ante bajo cabe con contra de desde durante en entre hacia hasta mediante para por segun sin sobre tras
    y e o u ni que pero sino aunque porque pues como cuando mientras donde cual cuales quien quienes
    todo toda todos todas nada algo alguien nadie cada otro otra otros otras mucho mucha muchos muchas poco poca pocos pocas
    es son soy eres somos era eras eran fue fui fueron sido esta estas estan estoy estamos
    hay ha han he hemos has habia voy vas va van vamos
    oh ah eh uh ay ey hey yeah na la le uoh ooh woah whoa mmm hmm ja jaja""".split()
)

sp = SpellChecker(language="es")
FREQ = sp.word_frequency


# ─── phonetics ────────────────────────────────────────────────────────────────


def phon(word: str) -> str:
    """Rough es-MX sound key: words with equal keys are homophones."""
    w = word.lower().replace("ñ", "§").replace("gü", "gw").replace("ü", "u")
    w = "".join(c for c in unicodedata.normalize("NFD", w) if not unicodedata.combining(c))
    w = w.replace("ch", "č").replace("ll", "y").replace("rr", "R").replace("qu", "k")
    w = re.sub(r"gu(?=[ei])", "g", w)
    w = re.sub(r"g(?=[ei])", "x", w)
    w = re.sub(r"c(?=[ei])", "s", w)
    w = w.replace("z", "s").replace("c", "k").replace("j", "x").replace("v", "b")
    w = w.replace("h", "")
    w = re.sub(r"^r|(?<=[nls])r", "R", w)
    w = re.sub(r"y$", "i", w)
    return w


def lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def base(w: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", w.lower().replace("ñ", "§")) if not unicodedata.combining(c))


def is_content(w: str) -> bool:
    return base(w) not in STOPWORDS


def is_word(w: str) -> bool:
    return bool(re.fullmatch(r"[a-záéíóúüñ]+", w))


def is_inflection(a: str, b: str) -> bool:
    """True for ending-only pairs (solo/sola, baila/bailar, esta/estas): real
    contrasts, but weaker listening practice than a changed consonant/vowel."""
    if a[:-1] == b[:-1]:
        return True
    return (a.startswith(b) or b.startswith(a)) and abs(len(a) - len(b)) == 1


def candidates(word: str) -> list[str]:
    """Real words exactly one sound away from `word`: real contrasts before
    plain inflections, then most common first."""
    key = phon(word)
    out: dict[str, int] = {}
    edits = set()
    for i in range(len(word) + 1):
        for ch in ALPHABET:
            edits.add(word[:i] + ch + word[i:])  # insert
            if i < len(word):
                edits.add(word[:i] + ch + word[i + 1 :])  # substitute
        if i < len(word):
            edits.add(word[:i] + word[i + 1 :])  # delete
    for c in edits:
        if c == word or not is_word(c) or len(c) < 3:
            continue
        f = FREQ[c]
        if f < (MIN_SHORT_FREQ if len(c) <= 3 else MIN_FREQ):
            continue
        if lev(key, phon(c)) == 1:
            out[c] = f
    return sorted(out, key=lambda c: (is_inflection(word, c), -out[c]))


# ─── inputs ───────────────────────────────────────────────────────────────────


def load_songs() -> list[dict]:
    """Songs that show up in the Listening picker (no displayName placeholder)."""
    src = (ROOT / "data" / "songs.ts").read_text(encoding="utf-8")
    songs = []
    for block in re.findall(r"\{\s*\n\s*id: \"\d+\".*?\n  \}", src, flags=re.S):
        if "displayName:" in block:
            continue
        songs.append(
            {
                "id": re.search(r'id: "(\d+)"', block).group(1),
                "name": re.search(r'\n    name: "([^"]+)"', block).group(1),
                "artist": re.search(r'artist: "([^"]+)"', block).group(1),
            }
        )
    return songs


def fetch_lines(song: dict) -> list[str]:
    CACHE.mkdir(exist_ok=True)
    cache = CACHE / f"lyrics_{song['id']}.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    qs = urllib.parse.urlencode({"track_name": song["name"], "artist_name": song["artist"]})
    try:
        with urllib.request.urlopen(f"https://lrclib.net/api/get?{qs}", timeout=20) as r:
            data = json.load(r)
    except Exception as e:  # noqa: BLE001 - no lyrics just means no phrases
        print(f"  ! no lyrics for {song['name']}: {e}")
        return []
    text = data.get("plainLyrics") or re.sub(r"\[[^\]]*\]", "", data.get("syncedLyrics") or "")
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    cache.write_text(json.dumps(lines, ensure_ascii=False), encoding="utf-8")
    return lines


def clip_id(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


def clean_gloss(g: str) -> str:
    return re.split(r"\s+[—–-]\s+|\s+—\s+|\s+�\s+", g)[0].strip()


# ─── build ────────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--review", action="store_true", help="print every item")
    args = ap.parse_args()

    ov = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    exclude = {w.lower() for w in ov.get("exclude", [])}
    forced = {k.lower(): v.lower() for k, v in ov.get("distractors", {}).items()}
    exclude_phrases = {p.lower() for p in ov.get("excludePhrases", [])}
    # Items to drop without banning the text as a distractor elsewhere
    # (e.g. clips the recogniser check flagged — see check_clips.py).
    exclude_targets = {t.lower() for t in ov.get("excludeTargets", [])}

    vocab = json.loads((ROOT / "data" / "vocabulary.json").read_text(encoding="utf-8"))
    pair_cache: dict[str, str | None] = {}

    def distractor_for(word: str) -> str | None:
        if word in exclude:
            return None
        if word not in pair_cache:
            if word in forced:
                pair_cache[word] = forced[word]
            elif not (MIN_WORD_LEN <= len(word) <= MAX_WORD_LEN) or FREQ[word] < MIN_FREQ:
                pair_cache[word] = None
            else:
                c = [x for x in candidates(word) if x not in exclude]
                pair_cache[word] = c[0] if c else None
        return pair_cache[word]

    items: list[dict] = []
    for song in load_songs():
        # Stable pseudo-random order: excluding an item never reshuffles the rest.
        order = lambda text: hashlib.sha1(f"{song['id']}:{text}".encode()).hexdigest()  # noqa: E731
        print(f"{song['id']}. {song['name']}")

        # words
        pool = [
            w
            for w in vocab.get(song["name"], {})
            if is_word(w) and is_content(w) and w not in exclude_targets and distractor_for(w)
        ]
        # Real sound contrasts first, then plain a/o-style endings.
        pool.sort(key=lambda w: (is_inflection(w, distractor_for(w)), order(w)))
        for w in pool[:WORDS_PER_SONG]:
            items.append(
                {
                    "id": f"{song['id']}-w-{w}",
                    "songId": song["id"],
                    "kind": "word",
                    "text": w,
                    "distractor": distractor_for(w),
                    "gloss": clean_gloss(vocab[song["name"]][w]),
                    "clip": clip_id(w),
                }
            )

        # phrases
        seen: set[str] = set()
        phrases: list[tuple[str, str]] = []
        for line in fetch_lines(song):
            line = re.sub(r"[\(\[].*?[\)\]]", " ", line).lower()
            # Lyric lines are often two ideas joined by punctuation
            # ("quiero bailar, quiero cantar"); each chunk is a phrase.
            for chunk in re.split(r"[,;:.!?¡¿…—–]|\s-\s|\.\.\.", line):
                toks = re.sub(r"[^\w\sáéíóúüñ]|\d|_", " ", chunk).split()
                if not 2 <= len(toks) <= MAX_PHRASE_WORDS or len(set(toks)) < 2 or not all(is_word(t) for t in toks):
                    continue
                phrase = " ".join(toks)
                if phrase in seen or phrase in exclude_phrases or phrase in exclude_targets:
                    continue
                if sum(is_content(t) for t in toks) < 2:
                    continue  # a word plus articles/filler isn't a phrase
                swappable = [
                    t for t in toks if is_content(t) and distractor_for(t) and not is_inflection(t, distractor_for(t))
                ]
                if not swappable:
                    continue
                target = max(swappable, key=len)
                seen.add(phrase)
                phrases.append((phrase, " ".join(distractor_for(target) if t == target else t for t in toks)))
        phrases.sort(key=lambda pr: order(pr[0]))
        for phrase, alt in phrases[:PHRASES_PER_SONG]:
            items.append(
                {
                    "id": f"{song['id']}-p-{clip_id(phrase)}",
                    "songId": song["id"],
                    "kind": "phrase",
                    "text": phrase,
                    "distractor": alt,
                    "clip": clip_id(phrase),
                }
            )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    n_clips = len({i["clip"] for i in items})
    print(f"\n{len(items)} items, {n_clips} unique clips -> {OUT.relative_to(ROOT)}")
    if args.review:
        for i in items:
            print(f"  [{i['songId']}] {i['kind']:6} {i['text']:24} vs {i['distractor']}")


if __name__ == "__main__":
    main()
