import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/** One aligned phone pair from the assessment.
 *  - equal:  target phone matched
 *  - sub:    said a different phone
 *  - delete: target phone was missing from what was said
 *  - insert: an extra phone was said */
export interface PhonemeAlignment {
  op: "equal" | "sub" | "delete" | "insert";
  target: string | null;
  spoken: string | null;
}

export interface PronunciationResult {
  /** IPA the lyric line should sound like (words separated by spaces). */
  targetIpa: string;
  /** IPA the model heard in the recording. */
  spokenIpa: string;
  /** 0–100 feature-weighted accuracy. */
  score: number;
  alignment: PhonemeAlignment[];
}

// Calls the "transcribe-ipa" Supabase Edge Function, which forwards the clip to
// the self-hosted Modal phoneme service (ml/pronunciation/) — the service URL +
// shared secret stay server-side. Sending the lyric line as `target` makes the
// service score the recording against it.
export async function assessPronunciation(
  target: string,
  audioBase64: string,
  mime: string,
): Promise<PronunciationResult> {
  const { data, error } = await supabase.functions.invoke("transcribe-ipa", {
    body: { audioBase64, mime, target },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }

  return {
    targetIpa: data?.target_ipa ?? "",
    spokenIpa: data?.spoken_ipa ?? data?.ipa ?? "",
    score: typeof data?.score === "number" ? data.score : 0,
    alignment: Array.isArray(data?.alignment) ? data.alignment : [],
  };
}
