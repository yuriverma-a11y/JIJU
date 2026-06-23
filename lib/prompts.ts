// Prompt templates. The brand-voice system prompt is stable across requests;
// the user prompts assemble per-run context (keyword clusters + live facts).

import type { AtlysSource, KeywordCluster } from "./types";

/**
 * Stable system prompt. Encodes Atlys voice + the hard rules. Tuned for
 * EXTENSIVE, keyword-rich, rank-focused content with CTAs woven in, for a
 * global audience.
 */
export const BRAND_VOICE_SYSTEM = `You are a senior SEO content writer for Atlys, a visa-application service used by travelers worldwide. You write extensive, keyword-rich FAQs and content for country landing pages (CLPs).

GOAL: maximize search ranking and AI-engine pickup. Pages should rank for as many relevant queries as possible while reading as genuinely helpful, human content.

VOICE
- Confident, clear, helpful. Second person ("you", "your").
- Human and natural. Vary sentence and paragraph length so it never reads as machine output.
- Specific and concrete: real steps, real requirements, real numbers (only when grounded in the FACTS provided).

EXTENSIVE + KEYWORD-RICH
- Answers are thorough and comprehensive. Lead with the direct answer, then cover the details, sub-cases, and the related points an applicant would actually want.
- Weave in as many RELEVANT keywords, related terms, synonyms, and natural long-tail phrasings as you can while staying readable. Cover the topic semantically so the page ranks broadly.
- High coverage, not stuffing: density must still feel natural to a human reader.

CALL TO ACTION (important)
- Weave natural Atlys calls to action throughout: applying with Atlys, getting the visa on time, end-to-end handling, tracking the application in one place. Vary the phrasing.
- Most answers about applying, documents, timelines, appointments, or fees should make the Atlys value clear and invite the reader to apply with Atlys. Do not turn every sentence into an ad.

GLOBAL AUDIENCE
- Tailor to the applicant's citizenship, country of residence, and destination. Requirements, fees, and where to apply differ by citizenship and residence. Never assume the applicant is from any one country.

HARD RULES (non-negotiable)
1. NEVER use em dashes or en dashes. Use commas, periods, or "to" for ranges. The copy is pasted directly onto a live page.
2. NEVER invent facts. Fees, processing times, validity, and document lists must come ONLY from the FACTS provided. If a needed number is not provided, write around it (for example "check the latest fees on the page") instead of guessing.
3. No AI cliches: "in today's world", "when it comes to", "rest assured", "look no further", "navigating the", "it's worth noting", "moreover", "furthermore", "seamless", "robust", "leverage".`;

function renderClusters(clusters: KeywordCluster[]): string {
  if (!clusters.length) return "(no keyword data available)";
  return clusters
    .map((c) => {
      const kws = c.keywords
        .slice(0, 16)
        .map(
          (k) =>
            `    - ${k.phrase}${k.volume ? ` (vol ${k.volume})` : ""}${
              k.difficulty != null ? ` (KD ${k.difficulty})` : ""
            }`,
        )
        .join("\n");
      return `  Topic: ${c.topic}${
        c.primaryQuestion ? `\n  Primary question: ${c.primaryQuestion}` : ""
      }\n${kws}`;
    })
    .join("\n\n");
}

function renderFacts(source: AtlysSource | null): string {
  if (!source || source.facts.length === 0) {
    return "(No structured facts were extracted. Do NOT state specific fees, durations, or counts you cannot ground.)";
  }
  return source.facts
    .map((f) => `  - ${f.label}: ${f.value}  [source: ${f.sourceUrl}]`)
    .join("\n");
}

/** FAQ generation prompt. Grounds the model on clusters + live atlys.com facts. */
export function buildFaqPrompt(opts: {
  destination: string;
  citizenship: string;
  residence: string;
  locale: string;
  count: number;
  clusters: KeywordCluster[];
  source: AtlysSource | null;
}): string {
  const sourceExcerpt = opts.source ? opts.source.text.slice(0, 6000) : "(none)";

  return `Write ${opts.count} extensive, keyword-rich FAQs for the Atlys ${opts.destination} visa landing page.

Audience: a ${opts.citizenship} citizen residing in ${opts.residence}, applying for a ${opts.destination} visa (locale ${opts.locale}). Tailor the answers to this citizenship and residence wherever it changes requirements, fees, or where to apply.

KEYWORD CLUSTERS (cover these topics broadly; use the questions and related terms to maximize ranking):
${renderClusters(opts.clusters)}

FACTS (the ONLY source for fees, durations, validity, and document lists):
${renderFacts(opts.source)}

SOURCE TEXT FROM atlys.com (background; do not copy verbatim, do not invent beyond it):
"""
${sourceExcerpt}
"""

Requirements:
- Each FAQ answers one real question thoroughly. Lead with the direct answer, then elaborate with specifics, sub-cases, and related details.
- Make answers EXTENSIVE and weave in as many relevant keywords and related terms as read naturally.
- Weave natural Atlys calls to action through the set (apply with Atlys, on-time guarantee, end-to-end handling).
- Apply ALL hard rules from the system prompt (no em/en dashes, no invented numbers).
- For each FAQ, list the target keywords you wove in and the fact labels you used.

Return ONLY a JSON object, no prose, matching exactly:
{
  "faqs": [
    {
      "question": "string",
      "answer": "string",
      "targetKeywords": ["string"],
      "factsUsed": ["string"]
    }
  ]
}`;
}
