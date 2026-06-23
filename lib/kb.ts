// Pure Knowledge Base helpers: normalization + dedup. The expand step (LLM
// call) lives in the API route; the client orchestrates the batched loop.

import type { KbQuestion } from "./kb-types";

/** Normalize a question for dedup: lowercase, strip punctuation, collapse space. */
export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deduplicate by normalized text, preserving first occurrence and order. */
export function dedupeQuestions(items: KbQuestion[]): KbQuestion[] {
  const seen = new Set<string>();
  const out: KbQuestion[] = [];
  for (const it of items) {
    const key = normalizeQuestion(it.question);
    if (key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** Count questions per visa type (for progress/coverage display). */
export function countByVisaType(items: KbQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const it of items) counts[it.visaType] = (counts[it.visaType] ?? 0) + 1;
  return counts;
}
