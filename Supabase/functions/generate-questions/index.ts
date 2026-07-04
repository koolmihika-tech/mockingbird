// Supabase Edge Function: generates reading/writing practice questions from a
// song's vocabulary using Gemini. Deployed with JWT verification ON (default),
// so only authenticated app users can call this — the GEMINI_API_KEY secret
// never reaches the client.
import { GoogleGenAI } from "npm:@google/genai";

console.log("[generate-questions] module loaded, GoogleGenAI import resolved");

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";

console.log("[generate-questions] GEMINI_API_KEY present:", !!GEMINI_API_KEY, "MODEL:", MODEL);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const questionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The question or writing prompt shown to the learner" },
      targetWord: { type: "string", description: "The vocabulary word this question focuses on" },
      type: { type: "string", enum: ["multiple_choice", "fill_blank", "short_answer"] },
      options: { type: "array", items: { type: "string" }, description: "Only for multiple_choice" },
      answer: { type: "string", description: "The correct answer, or a sample answer for short_answer" },
    },
    required: ["prompt", "targetWord", "type", "answer"],
  },
};

function buildPrompt(songName: string, words: string[], mode: "reading" | "writing", count: number) {
  const wordList = words.join(", ");
  if (mode === "reading") {
    return (
      `You are a Spanish-language tutor. Using these vocabulary words from the song "${songName}": ${wordList}, ` +
      `write ${count} short reading-comprehension questions in Spanish. Each question should use one of the words ` +
      `in a short context sentence, then ask the learner to identify its meaning. Prefer "multiple_choice" questions ` +
      `with 3-4 plausible English options, one correct. Some may be "fill_blank" instead.`
    );
  }
  return (
    `You are a Spanish-language tutor. Using these vocabulary words from the song "${songName}": ${wordList}, ` +
    `write ${count} short writing-practice prompts in English, each asking the learner to write one Spanish ` +
    `sentence using a specific target word correctly. Use type "short_answer" and provide a sample correct sentence ` +
    `as the answer.`
  );
}

Deno.serve(async (req) => {
  console.log("[generate-questions] request received, method:", req.method);

  if (req.method === "OPTIONS") {
    console.log("[generate-questions] OPTIONS preflight, returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[generate-questions] authorization header present:", req.headers.has("authorization"));

  if (!GEMINI_API_KEY) {
    console.error("[generate-questions] GEMINI_API_KEY missing, aborting");
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    console.log("[generate-questions] raw body:", rawBody);
    const { songName, words, mode, count = 5 } = JSON.parse(rawBody);
    console.log("[generate-questions] parsed body:", { songName, wordsCount: words?.length, mode, count });

    if (!songName || !Array.isArray(words) || words.length === 0 || (mode !== "reading" && mode !== "writing")) {
      console.error("[generate-questions] validation failed for parsed body");
      return new Response(JSON.stringify({ error: "songName, words[], and mode ('reading'|'writing') are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-questions] calling Gemini, model:", MODEL);
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildPrompt(songName, words, mode, count);
    console.log("[generate-questions] prompt:", prompt);

    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
      response_format: { type: "text", mime_type: "application/json", schema: questionSchema },
    });
    console.log("[generate-questions] Gemini call returned, output_text:", interaction?.output_text);

    const questions = JSON.parse(interaction.output_text);
    console.log("[generate-questions] parsed questions count:", questions?.length);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-questions] caught error:", err instanceof Error ? err.stack ?? err.message : err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
