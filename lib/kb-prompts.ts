// Knowledge Base prompts. One LLM call expands a single (visa type × category)
// slice into many distinct applicant questions, varied across profiles and edge
// cases, deduped against a sample of what we already have. Global audience.

import { APPLICANT_PROFILES } from "./kb-taxonomy";

export const KB_SYSTEM = `You build exhaustive, realistic lists of the questions that real visa applicants ask. You think like the applicants themselves: anxious, detail-oriented, dealing with edge cases and unusual situations, from many different countries.

RULES
- Output QUESTIONS ONLY. No answers, no preamble.
- Each question must be distinct and natural, the way a real person would phrase it.
- NEVER use em dashes or en dashes. Use commas or "to" for ranges.
- Cover the full range: common cases, rare edge cases, and the messy real-world situations people actually worry about.
- Vary phrasing and specificity. Some short, some detailed with a scenario.
- Output strict JSON only.`;

export function buildKbExpandPrompt(opts: {
  country: string;
  visaType: string;
  category: string;
  citizenship: string;
  residence: string;
  count: number;
  avoid: string[];
}): string {
  const avoidBlock =
    opts.avoid.length > 0
      ? `\nDo NOT repeat these (already collected), and do not produce near-duplicates:\n${opts.avoid
          .slice(0, 40)
          .map((q) => `- ${q}`)
          .join("\n")}\n`
      : "";

  return `Generate ${opts.count} distinct questions that a ${opts.citizenship} citizen residing in ${opts.residence} asks about a ${opts.country} ${opts.visaType} visa, specifically on the topic of: ${opts.category}.

Vary the questions across these applicant profiles where relevant: ${APPLICANT_PROFILES.join(", ")}.

Include edge cases and tricky real-world situations for this topic (for example: missing or inconsistent documents, prior refusals, name mismatches, insufficient funds, minors, dual nationality, last-minute travel, special circumstances). Reflect that applicants come from many countries with different passports.
${avoidBlock}
Return ONLY strict JSON, no prose:
{ "questions": ["question one", "question two"] }`;
}
