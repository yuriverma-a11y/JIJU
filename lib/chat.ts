// Chat orchestrator (streaming). Classifies the request, then dispatches to the
// right pipeline (FAQs, blog, knowledge base, or freeform), emitting events so
// the UI can show progress and output as it is produced.

import { BLOG_SYSTEM, buildBlogPrompt } from "./blog";
import { fetchAtlysSource } from "./atlys-source";
import { buildFlags, cleanAnswer, stripDashes, stripEmEnDashes } from "./clean";
import { CONFIG } from "./config";
import {
  clpUrlFor,
  countryName,
  entityDisplayName,
  resolveEntity,
  semrushDatabaseForOrigin,
} from "./countries";
import { FREEFORM_SYSTEM } from "./freeform";
import { dedupeQuestions } from "./kb";
import { KB_SYSTEM, buildKbExpandPrompt } from "./kb-prompts";
import { generateJson, streamCompletion } from "./llm";
import { BRAND_VOICE_SYSTEM, buildFaqPrompt } from "./prompts";
import { classifyIntent } from "./router";
import { FaqResponseZ, parseJsonLoose } from "./schemas";
import { researchKeywords } from "./semrush";
import type { ChatIntent, ChatStreamEvent } from "./chat-types";
import type { AtlysFact, FaqItem, KeywordCluster } from "./types";
import type { KbQuestion } from "./kb-types";

type Emit = (e: ChatStreamEvent) => void;

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return parseJsonLoose(text);
  }
}

function extractH1(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

export async function runChatStream(
  opts: {
    message: string;
    destination?: string;
    citizenship?: string;
    residence?: string;
    locale?: string;
    intentOverride?: string;
  },
  emit: Emit,
): Promise<void> {
  const citizenship = opts.citizenship || "US";
  const residence = opts.residence || "US";
  const locale = opts.locale || "en-US";
  const override =
    opts.intentOverride && opts.intentOverride !== "auto"
      ? (opts.intentOverride as ChatIntent)
      : null;

  emit({ type: "status", text: "Understanding your request" });

  let intent: ChatIntent;
  let destInput = opts.destination || "";
  let count: number | null = null;
  let topic = "";
  let title = "";

  if (override) {
    intent = override;
    topic = opts.message;
  } else {
    const r = await classifyIntent({
      message: opts.message,
      destination: opts.destination,
      citizenship,
      residence,
    });
    intent = r.intent;
    if (r.destination && resolveEntity(r.destination)) destInput = r.destination;
    count = r.count;
    topic = r.topic || opts.message;
    title = r.title;
  }

  const entity = resolveEntity(destInput);
  emit({ type: "meta", intent });

  if ((intent === "faqs" || intent === "kb") && !entity) {
    emit({
      type: "message",
      text: 'Which destination should this be for? Pick a Destination above, or name a country or group (like "Schengen" or "US") in your message.',
    });
    return;
  }

  // ---- FAQs ----
  if (intent === "faqs" && entity) {
    const name = entityDisplayName(entity);
    const database = semrushDatabaseForOrigin(residence);
    const clpUrl = clpUrlFor(entity, locale, CONFIG.atlysBaseUrl);
    emit({ type: "status", text: "Researching keywords and reading atlys.com" });
    const [kw, src] = await Promise.all([
      researchKeywords({ entityName: name, seedKeywords: entity.seedKeywords, database, applyingFrom: residence }),
      fetchAtlysSource(clpUrl),
    ]);
    emit({ type: "status", text: "Writing FAQs" });
    const prompt = buildFaqPrompt({
      destination: name,
      citizenship: countryName(citizenship),
      residence: countryName(residence),
      locale,
      count: count || 10,
      clusters: kw.clusters,
      source: src,
    });
    const raw = await streamCompletion(
      { system: BRAND_VOICE_SYSTEM, prompt, maxTokens: 8000 },
      (d) => emit({ type: "delta", text: d }),
    );
    const parsed = FaqResponseZ.parse(safeJson(raw));
    const faqs: FaqItem[] = parsed.faqs.map((f, i) => {
      const question = cleanAnswer(f.question);
      const answer = cleanAnswer(f.answer);
      return {
        id: `faq-${i + 1}`,
        question,
        answer,
        targetKeywords: f.targetKeywords,
        factsUsed: f.factsUsed,
        reviewFlags: buildFlags(answer, f.targetKeywords, src.facts),
      };
    });
    emit({
      type: "message",
      text: `Here are ${faqs.length} FAQs for the ${name} visa, grounded on live atlys.com facts (${kw.source} keywords). Edit any inline, then export.`,
    });
    emit({
      type: "artifact",
      artifact: { type: "faqs", entityName: name, faqs, sourceUrls: src.url ? [src.url] : [], keywordsSource: kw.source },
    });
    return;
  }

  // ---- Blog ----
  if (intent === "blog") {
    const name = entity ? entityDisplayName(entity) : destInput || "visa";
    let clusters: KeywordCluster[] = [];
    let facts: AtlysFact[] = [];
    let sourceText = "";
    const sourceUrls: string[] = [];
    if (entity) {
      emit({ type: "status", text: "Researching keywords and reading atlys.com" });
      const database = semrushDatabaseForOrigin(residence);
      const clpUrl = clpUrlFor(entity, locale, CONFIG.atlysBaseUrl);
      const [kw, src] = await Promise.all([
        researchKeywords({ entityName: name, seedKeywords: entity.seedKeywords, database, applyingFrom: residence }),
        fetchAtlysSource(clpUrl),
      ]);
      clusters = kw.clusters;
      facts = src.facts;
      sourceText = src.text;
      if (src.url) sourceUrls.push(src.url);
    }
    emit({ type: "status", text: "Writing the blog" });
    const prompt = buildBlogPrompt({
      name,
      citizenship: countryName(citizenship),
      residence: countryName(residence),
      locale,
      topic,
      title,
      clusters,
      facts,
      sourceText,
    });
    const raw = await streamCompletion(
      { system: BLOG_SYSTEM, prompt, maxTokens: 8000 },
      (d) => emit({ type: "delta", text: d }),
    );
    const markdown = stripEmEnDashes(raw).trim();
    const t = title || extractH1(markdown) || `${name} Visa`;
    emit({
      type: "message",
      text: `Here is a draft blog: "${t}". It follows the Atlys hub playbook and is dash-free. Copy or download below.`,
    });
    emit({ type: "artifact", artifact: { type: "blog", title: t, markdown, sourceUrls } });
    return;
  }

  // ---- Knowledge base (bounded; full builder at /kb) ----
  if (intent === "kb" && entity) {
    const name = entityDisplayName(entity);
    emit({ type: "status", text: "Building the knowledge base" });
    const vts = ["Tourist", "Student", "Work"];
    const cats = ["Eligibility", "Required documents", "Fees and payment", "Processing time", "Rejection, refusal and reapplication"];
    const slices: Array<{ visaType: string; category: string }> = [];
    for (const vt of vts) for (const cat of cats) slices.push({ visaType: vt, category: cat });
    const target = count || 150;
    const maxSlices = Math.min(slices.length, 6);
    let collected: KbQuestion[] = [];
    let id = 0;
    for (let i = 0; i < maxSlices && collected.length < target; i++) {
      const s = slices[i];
      const prompt = buildKbExpandPrompt({
        country: name,
        visaType: s.visaType,
        category: s.category,
        citizenship: countryName(citizenship),
        residence: countryName(residence),
        count: 30,
        avoid: collected.slice(-30).map((q) => q.question),
      });
      try {
        const raw = await generateJson({ system: KB_SYSTEM, prompt, maxTokens: 4000 });
        const parsed = safeJson(raw) as { questions?: string[] };
        for (const q of parsed.questions ?? []) {
          collected.push({
            id: `q${++id}`,
            question: stripDashes(String(q)).trim(),
            visaType: s.visaType,
            category: s.category,
            source: "generated",
          });
        }
        collected = dedupeQuestions(collected);
        emit({ type: "status", text: `Generated ${collected.length} questions` });
      } catch {
        /* skip slice on failure */
      }
    }
    const questions = collected.slice(0, target);
    emit({
      type: "message",
      text: `Built ${questions.length} knowledge-base questions for the ${name} visa. This is a starter batch; for thousands across every visa type and topic, open the full Knowledge Base builder. Export below.`,
    });
    emit({ type: "artifact", artifact: { type: "kb", country: name, questions, partial: true } });
    return;
  }

  // ---- Freeform (anything) ----
  emit({ type: "status", text: "Writing" });
  const ctx = entity
    ? `Context: destination ${entityDisplayName(entity)}, citizenship ${countryName(citizenship)}, residence ${countryName(residence)}.`
    : `Context: citizenship ${countryName(citizenship)}, residence ${countryName(residence)}.`;
  const raw = await streamCompletion(
    { system: FREEFORM_SYSTEM, prompt: `${opts.message}\n\n${ctx}`, maxTokens: 8000 },
    (d) => emit({ type: "delta", text: d }),
  );
  const md = stripEmEnDashes(raw).trim();
  emit({ type: "message", text: "Done. Here is the draft, dash-free and in the Atlys voice. Copy or refine." });
  emit({ type: "artifact", artifact: { type: "markdown", markdown: md } });
}
