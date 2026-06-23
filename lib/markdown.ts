// Markdown export — the primary "easy to post" output (your chosen publishing
// path for now). Produces a clean, pasteable FAQ section plus an optional
// appendix with the JSON-LD schema for the dev embedding it on the CLP.

import { toScriptTag } from "./schema";
import type { GeneratedContent } from "./types";

/** Clean, human-pasteable FAQ markdown (no metadata noise). */
export function toMarkdown(content: GeneratedContent): string {
  const title = `${content.entityName} Visa: Frequently Asked Questions`;
  const lines: string[] = [`## ${title}`, ""];

  for (const faq of content.faqs) {
    lines.push(`### ${faq.question}`);
    lines.push("");
    lines.push(faq.answer.trim());
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

/** Full export: human markdown + a fenced JSON-LD block to embed on the page. */
export function toMarkdownWithSchema(content: GeneratedContent): string {
  const body = toMarkdown(content);
  const sources =
    content.sourceUrls.length > 0
      ? `\n---\n\n_Facts grounded on: ${content.sourceUrls
          .map((u) => `[${u}](${u})`)
          .join(", ")}_\n`
      : "";

  const schema = [
    "",
    "---",
    "",
    "### JSON-LD (embed in the CLP `<head>` for AI/SEO)",
    "",
    "```html",
    toScriptTag(content.faqs),
    "```",
    "",
  ].join("\n");

  return body + sources + schema;
}

/** Suggested filename for the downloaded .md, e.g. "france-faqs-en-US.md". */
export function exportFilename(content: GeneratedContent): string {
  const slug = content.entityName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-${content.request.contentType}-${content.request.locale}.md`;
}
