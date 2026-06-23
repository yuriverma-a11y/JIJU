// Generation provider — Kimi (Moonshot AI) via the OpenAI-compatible API.
//
// Kimi speaks the OpenAI Chat Completions protocol, so we use the `openai`
// client pointed at the Kimi base URL. Base URL + model id are env-configurable
// (you provide the exact values). Two helpers:
//   generateJson  — JSON-mode output (FAQs, knowledge-base questions)
//   generateText  — free-form output (blogs, long-form sections)

import OpenAI from "openai";
import { CONFIG } from "./config";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: CONFIG.kimiApiKey,
      baseURL: CONFIG.kimiBaseUrl,
    });
  }
  return client;
}

export async function generateJson(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: CONFIG.kimiModel,
    max_tokens: opts.maxTokens ?? 8000,
    temperature: opts.temperature ?? 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function generateText(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: CONFIG.kimiModel,
    max_tokens: opts.maxTokens ?? 8000,
    temperature: opts.temperature ?? 0.7,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}
