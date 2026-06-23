// Zod schemas + JSON repair for parsing model output, plus the JSON Schema used
// for structured-output generation.

import { z } from "zod";

export const KeywordItemZ = z.object({
  phrase: z.string(),
  volume: z.number().nullable().optional(),
  difficulty: z.number().nullable().optional(),
  isQuestion: z.boolean().optional().default(false),
});

export const KeywordClusterZ = z.object({
  topic: z.string(),
  primaryQuestion: z.string().nullable().optional(),
  keywords: z.array(KeywordItemZ).default([]),
});

export const KeywordResponseZ = z.object({
  clusters: z.array(KeywordClusterZ).default([]),
});

export const FaqZ = z.object({
  question: z.string(),
  answer: z.string(),
  targetKeywords: z.array(z.string()).default([]),
  factsUsed: z.array(z.string()).default([]),
});

export const FaqResponseZ = z.object({
  faqs: z.array(FaqZ).default([]),
});

/** JSON Schema for structured-output generation of the FAQ list. */
export const FAQ_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          targetKeywords: { type: "array", items: { type: "string" } },
          factsUsed: { type: "array", items: { type: "string" } },
        },
        required: ["question", "answer", "targetKeywords", "factsUsed"],
      },
    },
  },
  required: ["faqs"],
} as const;

/**
 * Best-effort extraction of a JSON object from model text that may be wrapped
 * in prose or ```json fences. Returns the parsed value or throws.
 */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  // Trim to the outermost {...}.
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  return JSON.parse(slice);
}
