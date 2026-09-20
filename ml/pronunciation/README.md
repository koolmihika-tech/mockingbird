# Pronunciation assessment service

Self-hosted phoneme-recognition backend for the song **Speaking** page
(`app/songs/[id]/speaking.tsx`). The app records a clip; this service
transcribes the **sounds actually produced** into IPA and scores them against
the target lyric line.

```
app (speaking.tsx)
  └─ Supabase/services/pronunciation.ts   assessPronunciation(target, base64, mime)
       └─ edge fn  assess-pronunciation   (JWT-verified, holds the secret)
            └─ Modal  mockingbird-pronunciation  /assess
                 wav2vec2-espeak (spoken IPA) + epitran (target IPA) + panphon (score)
```

## Why Modal

Two other free-hosting paths were ruled out first:
- **Hugging Face Spaces** — Docker (and Gradio) Spaces now require a paid
  PRO/Team plan just to *create*, even on the free CPU hardware. Only Static
  Spaces are free for everyone.
- **Render free web service** — genuinely card-free, but the free instance is
  0.1 vCPU / 512 MB, too small to run `torch` + a wav2vec2 model reliably.

**Modal's Starter plan** is free — **$30/month of included credits, no credit
card required to sign up** — and this service's cost per assessment (a few
seconds of CPU, including cold starts) is small enough that the free credit
covers on the order of tens of thousands of assessments/month. Nothing is
billed unless you later add a card yourself.

## What it does

| step | tool | why |
|------|------|-----|
| decode m4a / webm → 16 kHz mono | `ffmpeg` | phones need a fixed sample rate |
| audio → IPA of what was said | `facebook/wav2vec2-lv-60-espeak-cv-ft` (CTC) | phonetic transcriber — keeps mispronunciations instead of "fixing" them to the expected word |
| lyric text → target IPA | `epitran` (`spa-Latn`) | Spanish spelling is ~phonemic, so this is reliable and free |
| align + score | `panphon` | substitution cost = articulatory-feature distance, so `b`/`β`, `r`/`ɾ`, `d`/`ð` cost less than truly wrong sounds |

Response:

```json
{
  "target_ipa": "amoɾ",
  "spoken_ipa": "amol",
  "score": 82,
  "alignment": [
    { "op": "equal",  "target": "a", "spoken": "a" },
    { "op": "equal",  "target": "m", "spoken": "m" },
    { "op": "equal",  "target": "o", "spoken": "o" },
    { "op": "sub",    "target": "ɾ", "spoken": "l" }
  ]
}
```

## Deploy

```bash
pip install modal
modal setup                                   # one-time auth, no card

# shared secret the edge function will send in X-Assess-Secret
modal secret create pronunciation-secret ASSESS_SECRET=$(openssl rand -hex 24)

modal deploy ml/pronunciation/modal_app.py
# -> https://<workspace>--mockingbird-pronunciation-web.modal.run
```

First deploy builds the image and bakes in the model weights (~1 GB, a few
minutes). CPU inference on a short clip is ~1–3 s; the container idles down
after 5 min (`scaledown_window=300`), so occasional calls pay a cold start.

### Wire it to Supabase

Set these on the `assess-pronunciation` edge function
(`supabase secrets set ...` or the dashboard):

```
PRONUNCIATION_URL     = https://<workspace>--mockingbird-pronunciation-web.modal.run/assess
PRONUNCIATION_SECRET  = <the ASSESS_SECRET value from above>
```

Then deploy the function:

```bash
supabase functions deploy assess-pronunciation
```

## Local smoke test

```bash
modal serve ml/pronunciation/modal_app.py      # prints a temporary URL

curl -s $URL/assess \
  -H "X-Assess-Secret: $ASSESS_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"target_text\":\"amor\",\"audio_b64\":\"$(base64 -w0 sample.m4a)\",\"mime\":\"audio/m4a\"}"
```

## Known limitations (v1)

- **Phone-set drift.** The espeak CTC model and epitran don't use identical
  diacritics, so some substitutions in `alignment` are notation, not real
  errors. Treat `score` as directional until calibrated on real recordings.
- **Singing ≠ speech.** The model is trained on speech; sustained/pitched vowels
  degrade recognition. Prompting the learner to *say* the line (not sing it)
  helps.
- **No forced alignment / GOP yet.** A stronger next step is aligning the audio
  against the *expected* phones and scoring each one acoustically
  (torchaudio forced-alignment or Kaldi-style GOP). The response shape already
  has room for per-phone scores.
- **Spanish only** (`epitran spa-Latn`). Add languages by branching the epitran
  code and, ideally, a language-matched recogniser.
