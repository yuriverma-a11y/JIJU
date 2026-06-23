// Blog generator. Follows the Atlys content playbook (docs/CONTENT_SOP.md):
// the full hub/article template, CTAs woven throughout, grounded on live
// atlys.com facts + SEMrush keywords, dash-free (markdown-safe), global.

import { fetchAtlysSource } from "./atlys-source";
import { stripEmEnDashes } from "./clean";
import { CONFIG } from "./config";
import {
  clpUrlFor,
  countryName,
  entityDisplayName,
  resolveEntity,
  semrushDatabaseForOrigin,
} from "./countries";
import { generateText } from "./llm";
import { researchKeywords } from "./semrush";
import type { AtlysFact, KeywordCluster } from "./types";

export const BLOG_SYSTEM = `You are a senior SEO content writer for Atlys, a visa service used by travelers worldwide. You write extensive, rank-focused blog hubs and articles following the Atlys content playbook.

STRUCTURE (in this order):
1. YAML frontmatter: title (long, keyword-rich, lists the subtopics), url, last_updated, author (a name plus a role at Atlys), meta_description (keyword-rich).
2. A breadcrumb line (Home > ... > This page).
3. H1 (the page title).
4. Opening hook: a striking statistic or the single most consequential recent change. Establish authority and recency.
5. An early call-to-action blockquote pitching the managed Atlys application with concrete value props.
6. "What's New in <year>": a bulleted list, each item a bold lead-in plus a specific date or figure (only if grounded).
7. Body sections (## and ###): the real substance, specific and detailed.
8. "Every <X> visa type at a glance": one bullet each as Name: fee; processing time; validity; best-fit profile.
9. A document checklist with bold category headers.
10. "What Atlys Handles": value-prop bullets plus a CTA.
11. "When DIY Makes Sense": honest, trust-building.
12. Frequently Asked Questions: each question an ### H3 with a concise answer.
13. Related guides and Tools You Can Use (internal links).
14. Closing CTA plus an "Information is current as of <date>" disclaimer.
15. "Structured Data (for dev team)": BreadcrumbList and FAQPage JSON-LD in fenced code blocks.

VOICE: authoritative, data-driven, specific, second person, no fluff. Honest and helpful.

CALL TO ACTION: weave Atlys CTAs throughout (apply with Atlys, on-time guarantee, end-to-end handling, money-back protection, real-time tracking, courier passport return, 2 million plus applications, consulate-specific review, ~99.2% delivery prediction accuracy). Vary the phrasing. Do not turn every line into an ad.

GLOBAL: tailor to the applicant's citizenship, residence, and destination. Use their currency and idiom. Never assume the applicant is Indian.

HARD RULES:
- NEVER use em dashes or en dashes. Use commas, periods, or "to" for ranges. Hyphens and markdown rules (---) are fine.
- NEVER invent facts. Use ONLY the FACTS provided for fees, dates, durations, validity, and document specifics. If a needed number is missing, write around it ("check the latest on the page"). Omitting is better than a wrong number.
- No AI cliches: "in today's world", "when it comes to", "rest assured", "seamless", "robust", "leverage", "moreover", "furthermore".
- Output Markdown only.`;

function renderClusters(clusters: KeywordCluster[]): string {
  if (!clusters.length) return "(no keyword data available)";
  return clusters
    .map((c) => {
      const kws = c.keywords
        .slice(0, 16)
        .map((k) => `    - ${k.phrase}${k.volume ? ` (vol ${k.volume})` : ""}`)
        .join("\n");
      return `  Topic: ${c.topic}\n${kws}`;
    })
    .join("\n\n");
}

function renderFacts(facts: AtlysFact[]): string {
  if (!facts.length) {
    return "(No structured facts extracted. Do NOT state specific fees, durations, or counts you cannot ground.)";
  }
  return facts.map((f) => `  - ${f.label}: ${f.value}  [source: ${f.sourceUrl}]`).join("\n");
}

export function buildBlogPrompt(opts: {
  name: string;
  citizenship: string;
  residence: string;
  locale: string;
  topic: string;
  title: string;
  clusters: KeywordCluster[];
  facts: AtlysFact[];
  sourceText: string;
}): string {
  return `Write a complete Atlys blog about: ${opts.name} visa${opts.topic ? `, focused on: ${opts.topic}` : ""}.
${opts.title ? `Use this title: ${opts.title}.` : ""}
Audience: a ${opts.citizenship} citizen residing in ${opts.residence} (locale ${opts.locale}). Tailor the content, currency, and examples accordingly.

KEYWORD CLUSTERS (use to maximize ranking):
${renderClusters(opts.clusters)}

FACTS (the ONLY source for fees, dates, durations, validity, and document specifics):
${renderFacts(opts.facts)}

SOURCE TEXT FROM atlys.com (background; do not copy verbatim, do not invent beyond it):
"""
${opts.sourceText.slice(0, 6000)}
"""

Follow the full structure and ALL hard rules from the system prompt. Output the complete Markdown document only.`;
}

function extractH1(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

export async function generateBlog(opts: {
  destination: string;
  citizenship: string;
  residence: string;
  locale: string;
  topic?: string;
  title?: string;
}): Promise<{ title: string; markdown: string; sourceUrls: string[] }> {
  const entity = resolveEntity(opts.destination);
  const name = entity ? entityDisplayName(entity) : opts.destination;

  let clusters: KeywordCluster[] = [];
  let facts: AtlysFact[] = [];
  let sourceText = "";
  const sourceUrls: string[] = [];

  if (entity) {
    const database = semrushDatabaseForOrigin(opts.residence);
    const clpUrl = clpUrlFor(entity, opts.locale, CONFIG.atlysBaseUrl);
    const [kw, src] = await Promise.all([
      researchKeywords({
        entityName: name,
        seedKeywords: entity.seedKeywords,
        database,
        applyingFrom: opts.residence,
      }),
      fetchAtlysSource(clpUrl),
    ]);
    clusters = kw.clusters;
    facts = src.facts;
    sourceText = src.text;
    if (src.url) sourceUrls.push(src.url);
  }

  const prompt = buildBlogPrompt({
    name,
    citizenship: countryName(opts.citizenship),
    residence: countryName(opts.residence),
    locale: opts.locale,
    topic: opts.topic ?? "",
    title: opts.title ?? "",
    clusters,
    facts,
    sourceText,
  });

  const raw = await generateText({ system: BLOG_SYSTEM, prompt, maxTokens: 8000 });
  const markdown = stripEmEnDashes(raw).trim();
  const title = opts.title || extractH1(markdown) || `${name} Visa`;
  return { title, markdown, sourceUrls };
}
