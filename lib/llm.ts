// Generation provider — Kimi (Moonshot AI) via the OpenAI-compatible API.
//
// Kimi speaks the OpenAI Chat Completions protocol, so we use the `openai`
// client pointed at the Kimi base URL. Base URL + model id are env-configurable.
//
// NOTE: kimi-k2.6 only accepts temperature = 1, so we do NOT send a temperature
// override (the model default is used). Sending any other value returns a 400.

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
}): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: CONFIG.kimiModel,
    max_tokens: opts.maxTokens ?? 8000,
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
}): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: CONFIG.kimiModel,
    max_tokens: opts.maxTokens ?? 8000,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

/**
 * Streamed completion. Calls onDelta with each token chunk and returns the full
 * text. Used by the chat so output appears as it is written (perceived speed).
 * json mode is intentionally NOT used here for max compatibility with streaming;
 * callers that need JSON instruct it in the prompt and parse the result.
 */
export async function streamCompletion(
  opts: { system: string; prompt: string; maxTokens?: number },
  onDelta: (text: string) => void,
): Promise<string> {
  const stream = await getClient().chat.completions.create({
    model: CONFIG.kimiModel,
    max_tokens: opts.maxTokens ?? 8000,
    stream: true,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.prompt },
    ],
  });
  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? "";
    if (delta) {
      full += delta;
      onDelta(delta);
    }
  }
  return full;
}
