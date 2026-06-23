// Deterministic text guardrails. Pure functions, fully unit-testable.
//
// The headline requirement: generated copy must contain NO em dashes (—) or
// en dashes (–) so it can be pasted straight onto a CLP. The prompt asks the
// model to avoid them, but we GUARANTEE it here with a deterministic pass plus
// an export-time gate (`hasForbiddenDash`).

import type { AtlysFact, ReviewFlag } from "./types";

// Dash code points we treat as forbidden:
//   U+2012 figure dash, U+2013 en dash, U+2014 em dash, U+2015 horizontal bar.
// (U+2212 minus sign is intentionally excluded to avoid mangling math.)
const DASH_CLASS = "‒–—―";
const DASH_RE = new RegExp(`[${DASH_CLASS}]`);
const DASH_RE_G = new RegExp(`[${DASH_CLASS}]`, "g");

/** True if any forbidden dash (unicode dash or the "--" em-dash substitute) remains. */
export function hasForbiddenDash(text: string): boolean {
  return DASH_RE.test(text) || /\s--\s|\w--\w/.test(text);
}

/**
 * Remove every em/en dash and rewrite to natural, human punctuation:
 *  - numeric ranges  "10–15", "€80–€90"   → "10 to 15", "€80 to €90"
 *  - parenthetical   "word — word"          → "word, word"
 *  - tight joins     "word–word"            → "word, word"
 *  - "--" substitute "a -- b", "a--b"       → "a, b"
 * Then normalizes the punctuation/whitespace the rewrite can introduce.
 */
export function stripDashes(input: string): string {
  let t = input;

  // 1) Numeric / currency ranges → "to" (keep this before generic replacement).
  const rangeRe = new RegExp(
    `(\\p{Sc}?\\s?\\d[\\d.,]*)\\s*[${DASH_CLASS}]\\s*(\\p{Sc}?\\s?\\d[\\d.,]*)`,
    "gu",
  );
  t = t.replace(rangeRe, "$1 to $2");
  // "--" numeric range too.
  t = t.replace(
    /(\p{Sc}?\s?\d[\d.,]*)\s*--\s*(\p{Sc}?\s?\d[\d.,]*)/gu,
    "$1 to $2",
  );

  // 2) Remaining unicode dashes → comma. Collapse any surrounding spaces.
  t = t.replace(new RegExp(`\\s*[${DASH_CLASS}]\\s*`, "g"), ", ");

  // 3) "--" em-dash substitute → comma.
  t = t.replace(/\s*--\s*/g, ", ");

  // 4) Clean up artifacts the replacements can create.
  t = t
    .replace(/\s+,/g, ",") // space before comma
    .replace(/,\s*,+/g, ",") // doubled commas
    .replace(/,(?=\S)/g, ", ") // ensure space after comma
    .replace(/\s*,\s*([.!?;:])/g, "$1") // comma then terminal punctuation
    .replace(/([.!?;:])\s*,/g, "$1 ") // terminal punctuation then comma
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .replace(/^\s*,\s*/g, "") // leading comma
    .replace(/\s+([.!?,;:])/g, "$1") // space before punctuation
    .trim();

  return t;
}

/** True if any em/en dash (unicode) remains. Hyphens and "--" are allowed (markdown). */
export function hasEmEnDash(text: string): boolean {
  return DASH_RE.test(text);
}

/**
 * Markdown-safe dash cleanup: removes only unicode em/en dashes, preserving
 * ASCII hyphens and "---" (markdown rules, YAML frontmatter, list markers).
 * Use for blog/freeform Markdown; use stripDashes() for FAQ prose.
 */
export function stripEmEnDashes(input: string): string {
  let t = input;
  const rangeRe = new RegExp(
    `(\\p{Sc}?\\s?\\d[\\d.,]*)\\s*[${DASH_CLASS}]\\s*(\\p{Sc}?\\s?\\d[\\d.,]*)`,
    "gu",
  );
  t = t.replace(rangeRe, "$1 to $2");
  t = t.replace(new RegExp(`\\s*[${DASH_CLASS}]\\s*`, "g"), ", ");
  t = t.replace(/ +,/g, ",").replace(/,\s*,+/g, ",");
  return t;
}

// Common "AI tell" phrases that make copy read as machine-written.
const AI_TELLS: RegExp[] = [
  /\bin today'?s (?:fast[- ]paced |digital )?world\b/i,
  /\bin the (?:world|realm) of\b/i,
  /\bwhen it comes to\b/i,
  /\bit'?s (?:important|worth noting|crucial) to (?:note|remember|mention)\b/i,
  /\b(?:moreover|furthermore|additionally|notably),/i,
  /\bin conclusion\b/i,
  /\bnavigating the\b/i,
  /\brest assured\b/i,
  /\blook no further\b/i,
  /\bwhether you'?re\b/i,
  /\b(?:delve|dive) into\b/i,
  /\bunlock(?:ing)?\b/i,
  /\belevate\b/i,
  /\bseamless(?:ly)?\b/i,
  /\brobust\b/i,
  /\bleverage\b/i,
  /\bin this (?:article|guide|post)\b/i,
  /\bwe'?ve got you covered\b/i,
  /\bembark on\b/i,
  /\ba myriad of\b/i,
  /\bplethora\b/i,
  /\bboasts?\b/i,
  /\bnestled\b/i,
  /\btreasure trove\b/i,
];

/** Flag AI-tell phrases (best-effort human-ness check). */
export function lintAiTells(text: string): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  for (const re of AI_TELLS) {
    const m = re.exec(text);
    if (m) {
      flags.push({
        kind: "ai-tell",
        message: `Reads as AI-generated: "${m[0]}". Consider rephrasing.`,
        span: m[0],
      });
    }
  }
  return flags;
}

/** Flag keyword stuffing: a single target phrase repeated too often in one answer. */
export function lintKeywordDensity(
  text: string,
  keywords: string[],
  maxOccurrences = 6,
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const phrase = kw.trim().toLowerCase();
    if (phrase.length < 3) continue;
    const count = lower.split(phrase).length - 1;
    if (count > maxOccurrences) {
      flags.push({
        kind: "keyword-stuffing",
        message: `"${kw}" appears ${count} times — looks stuffed.`,
        span: kw,
      });
    }
  }
  return flags;
}

// Numbers / currency / durations that, if present in an answer, should be
// traceable to a fetched atlys.com fact. We surface anything that isn't, so a
// reviewer can confirm the figure is real (the no-hallucinated-facts guard).
const NUMERIC_TOKEN_RE =
  /(\p{Sc}\s?\d[\d.,]*|\b\d[\d.,]*\s?(?:days?|weeks?|months?|years?|hours?|%|EUR|USD|INR|AED)\b|\b\d{2,}[\d.,]*\b)/giu;

/** Flag numbers in the answer that don't appear in any supplied fact. */
export function lintUnsupportedNumbers(
  text: string,
  facts: AtlysFact[],
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const factBlob = facts.map((f) => `${f.label} ${f.value}`).join(" ");
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  NUMERIC_TOKEN_RE.lastIndex = 0;
  while ((m = NUMERIC_TOKEN_RE.exec(text)) !== null) {
    const token = m[0].trim();
    const digits = token.replace(/[^\d]/g, "");
    if (!digits || seen.has(digits)) continue;
    seen.add(digits);
    if (!factBlob.includes(digits)) {
      flags.push({
        kind: "unsupported-number",
        message: `"${token}" is not in the fetched atlys.com facts — verify before publishing.`,
        span: token,
      });
    }
  }
  return flags;
}

/** Full deterministic cleanup applied to every generated answer. */
export function cleanAnswer(text: string): string {
  let t = stripDashes(text);
  // Normalize stray whitespace and spacing around punctuation once more.
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

/** Build the full flag set for a single answer. */
export function buildFlags(
  answer: string,
  keywords: string[],
  facts: AtlysFact[],
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  if (hasForbiddenDash(answer)) {
    flags.push({
      kind: "dash-residual",
      message: "Em/en dash survived cleanup — run cleanAnswer() again.",
    });
  }
  flags.push(...lintAiTells(answer));
  flags.push(...lintKeywordDensity(answer, keywords));
  flags.push(...lintUnsupportedNumbers(answer, facts));
  return flags;
}
