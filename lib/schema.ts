// JSON-LD FAQPage schema builder. This is the structured-data output that lets
// Google AI Overviews and other AI assistants parse and cite the FAQs — the
// core GEO win. Pure functions.

import type { FaqItem } from "./types";

export interface FaqPageJsonLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

/** Strip any HTML so the schema carries clean plain text (schema.org wants text). */
function toPlainText(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFaqPageJsonLd(faqs: FaqItem[]): FaqPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: toPlainText(f.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: toPlainText(f.answer),
      },
    })),
  };
}

/** Render the schema as a ready-to-embed <script> tag string. */
export function toScriptTag(faqs: FaqItem[]): string {
  const json = JSON.stringify(buildFaqPageJsonLd(faqs), null, 2);
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
