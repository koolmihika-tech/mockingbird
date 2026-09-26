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

No Spanish-specific phone error rate is published; measure on the Common
Voice Spanish test split before trusting scores built on top of this.

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
