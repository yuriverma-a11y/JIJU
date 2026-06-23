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
 * Repair a JSON string that was cut off mid-stream (the usual cause of
 * "Unexpected end of JSON input"). Walks the text tracking string/escape state
 * and the bracket stack, drops any dangling trailing token, closes an open
 * string, and appends the missing closing brackets so JSON.parse can succeed.
 */
function repairTruncatedJson(input: string): string {
  let out = "";
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    out += ch;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  // If we ended inside a string, close it.
  if (inString) out += '"';

  // Drop a trailing comma or a dangling "key": with no value yet.
  out = out.replace(/,\s*$/, "");
  out = out.replace(/:\s*$/, ": null");
  out = out.replace(/,\s*$/, "");

  // Close any still-open brackets in reverse order.
  while (stack.length) out += stack.pop();
  return out;
}

/**
 * Best-effort extraction of a JSON object from model text that may be wrapped
 * in prose or ```json fences, and may be truncated. Returns the parsed value
 * or throws if even the repaired text is unparseable.
 */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  // Trim to the outermost {...}.
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
  try {
    return JSON.parse(slice);
  } catch {
    // Likely truncated output: keep from the first "{" and repair the tail.
    const fromStart = start >= 0 ? candidate.slice(start) : candidate;
    return JSON.parse(repairTruncatedJson(fromStart));
  }
}
