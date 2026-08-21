import type { Attempt } from "./lessonHistory";

// TS port of ml/priority_features.py::compute_features + the weights fitted
// by ml/refit_on_real_data.py (see ml/learned_weights.json). Pure function of
// attempt history, so it "updates as you go" simply by being called again
// once lesson_history has grown — no retraining needed for that. The
// weights themselves are static until someone reruns
// `python ml/refit_on_real_data.py` and copies the new values in here.
const WEIGHTS = {
  weakness: 0.32454117959971157,
  forgetting_decay: 1.1590107806643588,
  confidence: -0.7073105445718072,
  struggle_flag: 1.7133621339788039,
  intercept: -0.4737191677808573,
};

const EMA_ALPHA = 0.3;
const BASE_HALF_LIFE_DAYS = 10.0;
const HALF_LIFE_GROWTH = 1.4;
const CONFIDENCE_SATURATION_N = 8;
const EXPECTED_TIME_PER_Q_SEC = 15.0;

interface Features {
  weakness: number;
  forgetting_decay: number;
  confidence: number;
  struggle_flag: number;
}

// Features for the attempt happening at currentDay, computed only from
// attempts strictly before it — mirrors priority_features.compute_features.
function computeFeatures(prior: Attempt[], currentDay: number): Features {
  const nPrior = prior.length;

  let ema = prior[0].passed ? 1 : 0;
  for (let i = 1; i < prior.length; i++) {
    ema = EMA_ALPHA * (prior[i].passed ? 1 : 0) + (1 - EMA_ALPHA) * ema;
  }
  const weakness = 1 - ema;

  let streak = 0;
  for (let i = prior.length - 1; i >= 0; i--) {
    if (!prior[i].passed) break;
    streak++;
  }
  const estimatedHalfLife = BASE_HALF_LIFE_DAYS * Math.pow(HALF_LIFE_GROWTH, streak);
  const daysSinceLast = Math.max(0, currentDay - prior[prior.length - 1].day);
  const forgettingDecay = 1 - Math.exp(-daysSinceLast / estimatedHalfLife);

  const confidence = Math.min(nPrior / CONFIDENCE_SATURATION_N, 1.0);

  const avgTimePerQ = prior.reduce((sum, a) => sum + a.timePerQSec, 0) / nPrior;
  const struggleFlag = (avgTimePerQ / EXPECTED_TIME_PER_Q_SEC) * weakness;

  return {
    weakness,
    forgetting_decay: forgettingDecay,
    confidence,
    struggle_flag: struggleFlag,
  };
}

// priority_score = w.features + intercept; higher = practice sooner.
// Returns null when there's no attempt history yet — a "new" topic has no
// score, rather than a fabricated one.
export function scoreTopic(attempts: Attempt[], now: number): number | null {
  if (attempts.length === 0) return null;

  const sorted = [...attempts].sort((a, b) => a.day - b.day);
  const features = computeFeatures(sorted, now);

  return (
    WEIGHTS.weakness * features.weakness +
    WEIGHTS.forgetting_decay * features.forgetting_decay +
    WEIGHTS.confidence * features.confidence +
    WEIGHTS.struggle_flag * features.struggle_flag +
    WEIGHTS.intercept
  );
}
