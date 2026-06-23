// Orchestrator: destination + citizenship + residence -> keywords + live facts
// -> grounded generation (Kimi) -> dash cleanup + review flags -> content.

import { fetchAtlysSource } from "./atlys-source";
import { buildFlags, cleanAnswer } from "./clean";
import { CONFIG } from "./config";
import {
  clpUrlFor,
  countryName,
  entityDisplayName,
  resolveEntity,
  semrushDatabaseForOrigin,
} from "./countries";
import { generateJson } from "./llm";
import { BRAND_VOICE_SYSTEM, buildFaqPrompt } from "./prompts";
import { FaqResponseZ, parseJsonLoose } from "./schemas";
import { researchKeywords } from "./semrush";
import type {
  AtlysSource,
  FaqItem,
  GeneratedContent,
  GenerationRequest,
  KeywordResult,
} from "./types";

export interface GenerateResult {
  content: GeneratedContent;
  keywords: KeywordResult;
  source: AtlysSource;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return parseJsonLoose(text);
  }
}

export async function generateFaqs(
  req: GenerationRequest,
): Promise<GenerateResult> {
  const entity = resolveEntity(req.destination);
  if (!entity) throw new Error(`Unknown destination: "${req.destination}"`);

  const name = entityDisplayName(entity);
  const database = req.database ?? semrushDatabaseForOrigin(req.residence);
  const clpUrl = clpUrlFor(entity, req.locale, CONFIG.atlysBaseUrl);

  // Keyword research and live-facts fetch run in parallel.
  const [keywords, source] = await Promise.all([
    researchKeywords({
      entityName: name,
      seedKeywords: entity.seedKeywords,
      database,
      applyingFrom: req.residence,
    }),
    fetchAtlysSource(clpUrl),
  ]);

  const prompt = buildFaqPrompt({
    destination: name,
    citizenship: countryName(req.citizenship),
    residence: countryName(req.residence),
    locale: req.locale,
    count: req.count,
    clusters: keywords.clusters,
    source,
  });

  const raw = await generateJson({
    system: BRAND_VOICE_SYSTEM,
    prompt,
    maxTokens: 8000,
  });
  const parsed = FaqResponseZ.parse(safeJson(raw));

  const faqs: FaqItem[] = parsed.faqs.map((f, i) => {
    // Deterministic guarantee: every question and answer is dash-cleaned.
    const question = cleanAnswer(f.question);
    const answer = cleanAnswer(f.answer);
    return {
      id: `faq-${i + 1}`,
      question,
      answer,
      targetKeywords: f.targetKeywords,
      factsUsed: f.factsUsed,
      reviewFlags: buildFlags(answer, f.targetKeywords, source.facts),
    };
  });

  const content: GeneratedContent = {
    request: req,
    entityName: name,
    faqs,
    sourceUrls: source.url ? [source.url] : [],
    generatedAt: new Date().toISOString(),
  };

  return { content, keywords, source };
}
