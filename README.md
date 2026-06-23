# JIJU

Internal content studio for Atlys. Given a **country** (or a **country group** like
Schengen) JIJU generates, grounded on **live facts from atlys.com**:

- **FAQs** — keyword-rich, human-sounding, em/en-dash-free, with **JSON-LD `FAQPage` schema**.
- **Blogs** — long-form, keyword-aware posts. *(in progress)*
- **Knowledge Base** — an exhaustive per-country question bank (1000s of questions across
  visa types × applicant profiles × edge cases) exported for engineers and a future AI
  agent. *(in progress)*

Built for **Vercel** (Next.js App Router + TypeScript). Two-user internal tool.

## Stack

- **Next.js (App Router) + TypeScript** on Vercel.
- **Generation: Kimi (Moonshot AI)** via the OpenAI-compatible API. Base URL + model are
  env-configurable (`KIMI_BASE_URL`, `KIMI_MODEL`). Server-side only.
- **Keywords/questions: SEMrush Analytics REST API** (API key with units, in env). A mock
  backend runs when no key is set so the flow works locally.
- **Grounding: live atlys.com** — the matching CLP is fetched (browser UA + redirect-follow,
  required by their Cloudflare/geo setup) and fees/durations are extracted as the only
  numbers the model may use.
- **UI: `@atlys/design-system`** via a token-accurate local stand-in (`components/ds.tsx`)
  — the single swap point for the real private package.
- Output is exported as **Markdown** (+ JSON-LD for FAQs, structured JSON for the KB).
  No database; files are handed to engineers.

## Setup

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev                  # http://localhost:3000
```

Scripts: `npm run build`, `npm run typecheck`, `npm run test` (pure-logic unit tests).

## Environment

| Var | Purpose |
|---|---|
| `KIMI_API_KEY` | Kimi (Moonshot) generation. |
| `KIMI_BASE_URL` / `KIMI_MODEL` | Exact Kimi endpoint + model id your key uses. |
| `SEMRUSH_API_KEY` | SEMrush Analytics API key (with units). |
| `JIJU_ACCESS_TOKEN` | App access gate (defense-in-depth alongside SSO). |

## Access

Recommended: **Google SSO restricted to `@atlys.com`** (only Atlys people can open JIJU;
all generation bills to the one Kimi/SEMrush key). The built-in `JIJU_ACCESS_TOKEN`
middleware gate works today; SSO is the planned upgrade. Also enable Vercel Deployment
Protection.

> Note: a deployed backend can't reuse MCP connectors wired inside Claude Code / claude.ai
> (those are interactive). JIJU therefore calls SEMrush over its REST API directly with the
> key in env.

## Design system

The UI imports from `components/ds.tsx` (a token-accurate stand-in). To use the real
private package: configure `.npmrc`, `npm i @atlys/design-system`, import its `styles.css`
in `app/globals.css`, and swap the exports in `components/ds.tsx`. That one file is the
only swap point.

## Deploy (Vercel)

1. Push to Git, import into Vercel.
2. Add the env vars above.
3. Enable Deployment Protection (and/or Google SSO) for the 2-user gate.

## Limitations (by design)

- **Facts are human-gated.** Fees/times/docs come from live atlys.com and every figure is
  flagged for review. JIJU is a drafting accelerator, not an autopilot for price/legal claims.
- **SEMrush units cost money** — results are cached.
- **"No n-dashes" is guaranteed** by a deterministic post-pass + export gate; broader
  "human-ness" (AI-tell linter) is best-effort.
- **Knowledge Base runs in batches** (client-orchestrated) to respect Vercel function limits.

## Layout

```
app/                Next.js App Router (UI + API routes)
components/ds.tsx   Design-system swap point (local stand-in -> @atlys/design-system)
lib/
  clean.ts          em/en dash stripper + AI-tell linter + density check  (pure)
  schema.ts         JSON-LD FAQPage builder                                (pure)
  markdown.ts       Markdown export                                        (pure)
  countries.ts      country + group registry, slug resolver                (pure)
  content-types.ts  FAQs / Blogs / sections registry                       (pure)
  prompts.ts        brand-voice system prompt + generation templates
  llm.ts            Kimi (Moonshot) client, OpenAI-compatible
  semrush.ts        keyword engine: SEMrush REST + mock
  atlys-source.ts   live atlys.com fetch + facts extraction
  types.ts          shared types
```
