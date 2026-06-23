// Knowledge Base exports: Markdown (engineer hand-off, matching the FAQ
// procedure) and structured JSON (for the future AI agent). Pure.

import { CATEGORIES, VISA_TYPES } from "./kb-taxonomy";
import type { KbDataset } from "./kb-types";

export function toKbMarkdown(d: KbDataset): string {
  const lines: string[] = [
    `# ${d.country} Visa: Knowledge Base`,
    "",
    `Applying from: ${d.applyingFrom}. Total questions: ${d.questions.length}.`,
    "",
  ];

  const known = new Set<string>(VISA_TYPES);

  for (const vt of VISA_TYPES) {
    const inVt = d.questions.filter((q) => q.visaType === vt);
    if (!inVt.length) continue;
    lines.push(`## ${vt} visa (${inVt.length})`, "");
    for (const cat of CATEGORIES) {
      const inCat = inVt.filter((q) => q.category === cat);
      if (!inCat.length) continue;
      lines.push(`### ${cat}`, "");
      for (const q of inCat) lines.push(`- ${q.question}`);
      lines.push("");
    }
  }

  // Search-seeded or off-taxonomy questions.
  const others = d.questions.filter((q) => !known.has(q.visaType));
  if (others.length) {
    lines.push(`## Other / from search (${others.length})`, "");
    for (const q of others) lines.push(`- ${q.question}`);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function toKbJson(d: KbDataset): string {
  return JSON.stringify(
    {
      country: d.country,
      applyingFrom: d.applyingFrom,
      generatedAt: d.generatedAt,
      total: d.questions.length,
      questions: d.questions,
    },
    null,
    2,
  );
}

export function kbFilename(d: KbDataset, ext: "md" | "json"): string {
  const slug = d.country
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-knowledge-base.${ext}`;
}
