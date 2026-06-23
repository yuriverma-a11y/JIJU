// Centralized env + runtime configuration.

export const CONFIG = {
  // Generation provider: Kimi (Moonshot AI), via an OpenAI-compatible API.
  // KIMI_API_KEY is also accepted as MOONSHOT_API_KEY (the platform's name).
  kimiApiKey: process.env.KIMI_API_KEY ?? process.env.MOONSHOT_API_KEY ?? "",
  kimiBaseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
  // Default to a fast, non-reasoning model. The "thinking" models (kimi-k2.x)
  // spend 60s+ on hidden reasoning per call and time out the function; the
  // moonshot-v1 family answers in a few seconds, which is what these structured
  // generation tasks need. Override with KIMI_MODEL if you want a smarter model
  // (and raise the route maxDuration accordingly).
  kimiModel: process.env.KIMI_MODEL ?? "moonshot-v1-32k",

  // SEMrush Analytics REST API (API key with units).
  semrushApiKey: process.env.SEMRUSH_API_KEY ?? "",

  // App access gate (2 users) — defense-in-depth alongside SSO / Vercel protection.
  accessToken: process.env.JIJU_ACCESS_TOKEN ?? "",

  atlysBaseUrl: process.env.ATLYS_BASE_URL ?? "https://www.atlys.com",
  defaultLocale: process.env.DEFAULT_LOCALE ?? "en-US",
  defaultDatabase: process.env.SEMRUSH_DEFAULT_DATABASE ?? "us",
};

export function hasLlm(): boolean {
  return CONFIG.kimiApiKey.length > 0;
}

/** Which keyword backend is active, given the configured secrets. */
export function keywordSource(): "rest" | "mock" {
  return CONFIG.semrushApiKey ? "rest" : "mock";
}
