// Live atlys.com grounding. Fetches the CLP (and tolerates a 404), extracts
// readable text + candidate facts (currency amounts, durations). The generator
// is allowed to use ONLY these numbers; the unsupported-number linter flags any
// figure that isn't here. This is your chosen "pull facts live from atlys.com"
// accuracy guard.

import { cacheGet, cacheSet } from "./cache";
import type { AtlysFact, AtlysSource } from "./types";

const CACHE_TTL = 60 * 60 * 6; // 6h

function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decode(stripTags(titleMatch[1])).trim() : "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = decode(stripTags(body))
    .replace(/\s+/g, " ")
    .trim();
  return { title, text };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/g, "€");
}

const CURRENCY_RE = /(?:€|\$|£|₹|EUR|USD|AED|INR|GBP)\s?\d[\d.,]*/g;
const DURATION_RE =
  /\b\d+(?:\s?to\s?\d+)?\s?(?:calendar\s|business\s|working\s)?(?:days?|weeks?|months?|years?)\b/gi;

function extractFacts(text: string, url: string): AtlysFact[] {
  const facts: AtlysFact[] = [];
  const seen = new Set<string>();

  const push = (label: string, value: string) => {
    const key = `${label}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push({ label, value: value.trim(), sourceUrl: url });
  };

  for (const m of text.match(CURRENCY_RE) ?? []) push("Amount mentioned", m);
  for (const m of text.match(DURATION_RE) ?? []) push("Duration mentioned", m);

  // Cap to keep the prompt tight.
  return facts.slice(0, 16);
}

export async function fetchAtlysSource(url: string): Promise<AtlysSource> {
  const cached = await cacheGet<AtlysSource>(`src:${url}`);
  if (cached) return cached;

  let source: AtlysSource;
  try {
    // atlys.com is behind Cloudflare and geo-redirects (e.g. en-US -> en-IN).
    // A browser User-Agent is required (a bot UA gets challenged/blocked);
    // fetch follows the redirect by default.
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      source = {
        url,
        title: "",
        text: "",
        facts: [],
        fetchedAt: new Date().toISOString(),
      };
    } else {
      const html = await res.text();
      const { title, text } = htmlToText(html);
      // Extract facts from the full text, then store a trimmed copy so the API
      // response (which includes the source) stays small.
      const facts = extractFacts(text, url);
      source = {
        url,
        title,
        text: text.slice(0, 8000),
        facts,
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    source = {
      url,
      title: "",
      text: "",
      facts: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  await cacheSet(`src:${url}`, source, CACHE_TTL);
  return source;
}
