import { LISTENING_CLIPS } from "./clips";
import items from "./items.json";

/** One Listening question: hear `text`, pick it over `distractor`. */
export interface ListeningItem {
  id: string;
  songId: string;
  kind: "word" | "phrase";
  /** What the audio says (the correct answer). */
  text: string;
  /** A look-alike that differs from `text` by one sound. */
  distractor: string;
  /** English meaning, for words. */
  gloss?: string;
  /** Key into LISTENING_CLIPS. */
  clip: string;
}

// Built by ml/listening/build_items.py; audio by ml/listening/generate_clips.py.
export const LISTENING_ITEMS = items as ListeningItem[];

/** The pre-synthesised audio for an item (a Metro asset id for expo-audio). */
export const clipFor = (item: ListeningItem): number | undefined => LISTENING_CLIPS[item.clip];
