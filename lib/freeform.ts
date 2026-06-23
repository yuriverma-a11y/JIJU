// Freeform generator: anything the user asks that is not FAQs/blog/KB.

import { stripEmEnDashes } from "./clean";
import { generateText } from "./llm";

export const FREEFORM_SYSTEM = `You are JIJU, Atlys's content generator. You produce any content Atlys needs: snippets, ad copy, emails, social posts, outlines, summaries, rewrites, landing-page sections, knowledge-base questions, and more.

Apply the Atlys voice: confident, specific, helpful, second person, no fluff. Weave natural Atlys calls to action where relevant. Tailor to the audience.

HARD RULES:
- NEVER use em dashes or en dashes. Use commas, periods, or "to" for ranges.
- Do not invent specific visa fees, dates, or legal facts unless the user provided them; keep claims general otherwise.
- No AI cliches: "in today's world", "when it comes to", "rest assured", "seamless", "robust", "leverage".
- Output clean Markdown.`;

export async function generateFreeform(opts: {
  instruction: string;
  context?: string;
}): Promise<string> {
  const prompt = `${opts.instruction}${opts.context ? `\n\n${opts.context}` : ""}`;
  const raw = await generateText({
    system: FREEFORM_SYSTEM,
    prompt,
    maxTokens: 8000,
  });
  return stripEmEnDashes(raw).trim();
}
