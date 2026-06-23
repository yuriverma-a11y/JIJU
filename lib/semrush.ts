// Keyword engine. SEMrush Analytics REST API (API key with units) is the
// primary backend; a deterministic mock runs when no key is set so the flow
// works locally without SEMrush access.

import { cacheGet, cacheSet } from "./cache";
import { CONFIG, keywordSource } from "./config";
import type { KeywordCluster, KeywordResult } from "./types";

const CACHE_TTL = 60 * 60 * 24; // 24h — keyword data moves slowly

export interface KeywordQuery {
  entityName: string;
  seedKeywords: string[];
  database: string;
  applyingFrom: string;
}

export async function researchKeywords(q: KeywordQuery): Promise<KeywordResult> {
  const cacheKey = `kw:${q.entityName}:${q.database}:${q.applyingFrom}`;
  const cached = await cacheGet<KeywordResult>(cacheKey);
  if (cached) return cached;

  const source = keywordSource();
  const result = source === "rest" ? await viaRest(q) : mock(q);

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

// SEMrush Analytics API: phrase_questions + phrase_related (and fullsearch).
async function viaRest(q: KeywordQuery): Promise<KeywordResult> {
  const seed = q.seedKeywords[0] ?? `${q.entityName} visa`;
  const base = "https://api.semrush.com/";
  const common = `key=${encodeURIComponent(CONFIG.semrushApiKey)}&database=${encodeURIComponent(
    q.database,
  )}&display_limit=50&export_columns=Ph,Nq,Kd`;

  async function pull(type: string): Promise<KeywordCluster["keywords"]> {
    const url = `${base}?type=${type}&phrase=${encodeURIComponent(seed)}&${common}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const csv = await res.text();
    const rows = csv.trim().split("\n").slice(1); // drop header row
    return rows
      .map((line) => {
        const [phrase, nq, kd] = line.split(";");
        return {
          phrase: phrase ?? "",
          volume: nq ? Number(nq) : undefined,
          difficulty: kd ? Number(kd) : undefined,
          isQuestion: /^(how|what|when|where|why|who|can|do|does|is|are)\b/i.test(
            phrase ?? "",
          ),
        };
      })
      .filter((k) => k.phrase.length > 0);
  }

  const [questions, related] = await Promise.all([
    pull("phrase_questions"),
    pull("phrase_related"),
  ]);

  const clusters: KeywordCluster[] = [];
  if (questions.length) clusters.push({ topic: "questions", keywords: questions });
  if (related.length) clusters.push({ topic: "related", keywords: related });

  return {
    entity: q.entityName,
    database: q.database,
    clusters,
    fetchedAt: new Date().toISOString(),
    source: "rest",
    notes: clusters.length
      ? undefined
      : "SEMrush returned no rows — check the API key, database, or remaining units.",
  };
}

function mock(q: KeywordQuery): KeywordResult {
  const name = q.entityName;
  return {
    entity: name,
    database: q.database,
    source: "mock",
    fetchedAt: new Date().toISOString(),
    notes: "MOCK keyword data — set SEMRUSH_API_KEY for real research.",
    clusters: [
      {
        topic: "fees",
        primaryQuestion: `How much does a ${name} visa cost?`,
        keywords: [
          { phrase: `${name} visa fees`, volume: 5400, difficulty: 42, isQuestion: false },
          { phrase: `how much is a ${name} visa`, volume: 1300, difficulty: 38, isQuestion: true },
        ],
      },
      {
        topic: "processing time",
        primaryQuestion: `How long does a ${name} visa take?`,
        keywords: [
          { phrase: `${name} visa processing time`, volume: 2900, difficulty: 40, isQuestion: false },
          { phrase: `how long does ${name} visa take`, volume: 880, difficulty: 33, isQuestion: true },
        ],
      },
      {
        topic: "documents",
        primaryQuestion: `What documents do I need for a ${name} visa?`,
        keywords: [
          { phrase: `${name} visa documents required`, volume: 3600, difficulty: 45, isQuestion: false },
          { phrase: `${name} visa requirements`, volume: 8100, difficulty: 51, isQuestion: false },
        ],
      },
    ],
  };
}
