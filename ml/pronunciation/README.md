# IPA transcription service

Self-hosted phoneme-recognition backend for the song **Speaking** page
(`app/songs/[id]/speaking.tsx`). The app records a clip; this service
transcribes the **sounds actually produced** into IPA.

```
app (speaking.tsx, "Check accuracy")
  └─ Supabase/services/transcription.ts   transcribeIpa(base64, mime)
       └─ edge fn  transcribe-ipa          (JWT-verified, holds the secret)
            └─ Modal  mockingbird-pronunciation  POST /transcribe  -> { ipa }
```

## Model & data

- **Model:** [`facebook/wav2vec2-xlsr-53-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-xlsr-53-espeak-cv-ft) (Apache 2.0)
- **Pretraining:** XLSR-53 — ~56K hours of unlabeled speech in 53 languages, including Spanish
- **Fine-tuning:** multilingual Common Voice, labeled with `espeak-ng` IPA (Spanish is a training language)
- **Paper:** Xu, Baevski & Auli, *Simple and Effective Zero-shot Cross-lingual Phoneme Recognition* (arXiv 2109.11680)

No Spanish-specific phone error rate is published, so we measure it
ourselves — see **Accuracy check** below.

## Accuracy check (Common Voice Spanish)

`eval_common_voice_es.py` runs the model on a fixed-seed random sample of the
Common Voice 17.0 Spanish **test** split and reports phone error rate (PER)
against the `espeak-ng` IPA of each clip's sentence, for both the Castilian
(`es`) and Latin American (`es-419`) espeak voices, plus the most common
substitutions.

```bash
modal run ml/pronunciation/eval_common_voice_es.py            # 500 clips, seed 0
modal run ml/pronunciation/eval_common_voice_es.py --n 2000 --seed 1
```

Results land in `ml/pronunciation/eval/` (`.json` summary, `.csv` per clip).

- **Data source:** Mozilla moved Common Voice off Hugging Face, so this reads
  the CC0 parquet mirror `fixie-ai/common_voice_17_0` (15,857 Spanish test clips).
- **Optimistic bound:** CV splits are only speaker-disjoint *within* a release;
  the model was fine-tuned on an older release, so some test clips may overlap
  its training data. And this is clean native read speech, not learners.

## Setup

Secret shared between Modal and the edge function (`X-Assess-Secret` header):

```bash
SECRET=$(openssl rand -hex 24)
modal secret create pronunciation-secret ASSESS_SECRET=$SECRET --force
npx supabase secrets set PRONUNCIATION_SECRET=$SECRET --project-ref jblzvpijmfshunhehcac
```

Deploy the model (first build bakes in ~1.3 GB of weights, a few minutes):

```bash
modal deploy ml/pronunciation/modal_app.py
# -> https://<workspace>--mockingbird-pronunciation-web.modal.run
```

Point the edge function at it and deploy:

```bash
npx supabase secrets set PRONUNCIATION_URL=https://<workspace>--mockingbird-pronunciation-web.modal.run/transcribe --project-ref jblzvpijmfshunhehcac
npx supabase functions deploy transcribe-ipa --project-ref jblzvpijmfshunhehcac
```

## Smoke test

```bash
curl -s https://<workspace>--mockingbird-pronunciation-web.modal.run/health
```

## Known limitations

- **Singing ≠ speech.** Trained on read speech; prompt learners to *say* the line.
- **Cold starts.** The container idles down after 5 min (`scaledown_window=300`),
  so the first request after a quiet period takes longer.
