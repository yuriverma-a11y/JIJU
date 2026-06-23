// Intent router: classifies a free-text request into an intent and extracts
// parameters, so the user can just say what they want.

import { z } from "zod";
import { generateJson } from "./llm";
import { parseJsonLoose } from "./schemas";

export const ROUTER_SYSTEM = `You route content requests for JIJU, Atlys's content tool. Read the request and decide what the user wants, then extract parameters. Output strict JSON only, no prose.`;

const RouterZ = z.object({
  intent: z.enum(["faqs", "blog", "kb", "freeform"]).catch("freeform"),
  destination: z.string().catch(""),
  count: z.number().nullable().catch(null),
  topic: z.string().catch(""),
  title: z.string().catch(""),
});

export type RouterResult = z.infer<typeof RouterZ>;

export function buildRouterPrompt(opts: {
  message: string;
  destination?: string;
  citizenship?: string;
  residence?: string;
}): string {
  return `User request:
"""
${opts.message}
"""

Current context from the selectors: destination=${opts.destination || "unset"}, citizenship=${opts.citizenship || "unset"}, residence=${opts.residence || "unset"}.

Decide intent (one of):
- "faqs": they want FAQ question/answer content for a visa or country landing page.
- "blog": they want a blog, article, guide, or hub.
- "kb": they want a knowledge base or a large set of questions (often "for an agent" or "thousands of questions").
- "freeform": anything else (ad copy, emails, social posts, outlines, summaries, rewrites, etc.).

Extract:
- destination: the country or group named in the request (e.g. "Schengen", "US", "Japan"), else "".
- count: a number of items if the user stated one, else null.
- topic: the specific angle or subject (e.g. "rejection reasons", "student visa"), else "".
- title: an explicit title if the user gave one, else "".

Return ONLY JSON:
{ "intent": "...", "destination": "...", "count": null, "topic": "...", "title": "..." }`;
}

export async function classifyIntent(opts: {
  message: string;
  destination?: string;
  citizenship?: string;
  residence?: string;
}): Promise<RouterResult> {
  const raw = await generateJson({
    system: ROUTER_SYSTEM,
    prompt: buildRouterPrompt(opts),
    maxTokens: 500,
  });
  try {
    return RouterZ.parse(JSON.parse(raw));
  } catch {
    try {
      return RouterZ.parse(parseJsonLoose(raw));
    } catch {
      return { intent: "freeform", destination: "", count: null, topic: "", title: "" };
    }
  }
}
