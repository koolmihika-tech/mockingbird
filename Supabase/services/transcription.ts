import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Calls the "transcribe-ipa" Supabase Edge Function, which forwards the clip to
// the self-hosted Modal phoneme service (ml/pronunciation/) — the service URL +
// shared secret stay server-side. Returns the IPA of what was actually said.
export async function transcribeIpa(audioBase64: string, mime: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("transcribe-ipa", {
    body: { audioBase64, mime },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }

  return typeof data?.ipa === "string" ? data.ipa : "";
}
