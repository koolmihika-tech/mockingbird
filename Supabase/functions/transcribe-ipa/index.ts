// Supabase Edge Function: proxies an IPA-transcription request to the
// self-hosted Modal service (ml/pronunciation/modal_app.py). Deployed with JWT
// verification ON (default), so only authenticated app users can call this — the
// shared secret for the Modal endpoint never reaches the client.
//
// Required function secrets:
//   PRONUNCIATION_URL     e.g. https://<workspace>--mockingbird-pronunciation-web.modal.run/transcribe
//   PRONUNCIATION_SECRET  the ASSESS_SECRET value from the Modal secret

const PRONUNCIATION_URL = Deno.env.get("PRONUNCIATION_URL");
const PRONUNCIATION_SECRET = Deno.env.get("PRONUNCIATION_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!PRONUNCIATION_URL || !PRONUNCIATION_SECRET) {
    console.error("[transcribe-ipa] PRONUNCIATION_URL / PRONUNCIATION_SECRET not configured");
    return json({ error: "Transcription service is not configured" }, 500);
  }

  try {
    const { audioBase64, mime, target } = await req.json();

    if (typeof audioBase64 !== "string" || !audioBase64) {
      return json({ error: "audioBase64 (string) is required" }, 400);
    }

    const upstream = await fetch(PRONUNCIATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Assess-Secret": PRONUNCIATION_SECRET,
      },
      body: JSON.stringify({
        audio_b64: audioBase64,
        mime: typeof mime === "string" && mime ? mime : "audio/m4a",
        // Optional lyric line — when sent, the service also scores the clip.
        target_text: typeof target === "string" && target.trim() ? target : undefined,
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("[transcribe-ipa] upstream error", upstream.status, text.slice(0, 500));
      let detail = text;
      try {
        detail = JSON.parse(text).detail ?? text;
      } catch {
        // keep raw text
      }
      return json({ error: `Transcription failed: ${detail}` }, upstream.status === 401 ? 500 : 502);
    }

    return new Response(text, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[transcribe-ipa] caught error:", err instanceof Error ? err.stack ?? err.message : err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
