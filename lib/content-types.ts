// Content-type registry. FAQs are the v1 focus; the other CLP sections are
// defined here so the generator, prompts, and UI can extend to them without
// structural changes (your "FAQs first, other sections too" choice).

import type { ContentTypeId } from "./types";

export interface ContentTypeDef {
  id: ContentTypeId;
  label: string;
  description: string;
  /** "faq" = Q&A list; "section" = prose block(s). */
  promptKind: "faq" | "section";
  defaultCount: number;
  /** Whether the UI offers it yet. */
  enabled: boolean;
}

export const CONTENT_TYPES: Record<ContentTypeId, ContentTypeDef> = {
  faqs: {
    id: "faqs",
    label: "FAQs",
    description:
      "Keyword-rich question/answer pairs with JSON-LD FAQPage schema.",
    promptKind: "faq",
    defaultCount: 8,
    enabled: true,
  },
  hero: {
    id: "hero",
    label: "Hero copy",
    description: "Headline + subhead for the top of the CLP.",
    promptKind: "section",
    defaultCount: 1,
    enabled: false,
  },
  intro: {
    id: "intro",
    label: "Intro paragraph",
    description: "Short keyword-aware introduction to the visa.",
    promptKind: "section",
    defaultCount: 1,
    enabled: false,
  },
  "why-atlys": {
    id: "why-atlys",
    label: "Why Atlys",
    description: "Benefit bullets / trust copy for the CLP.",
    promptKind: "section",
    defaultCount: 6,
    enabled: false,
  },
  documents: {
    id: "documents",
    label: "Document checklist",
    description: "Required-documents section, grounded on live facts.",
    promptKind: "section",
    defaultCount: 1,
    enabled: false,
  },
};

export function enabledContentTypes(): ContentTypeDef[] {
  return Object.values(CONTENT_TYPES).filter((c) => c.enabled);
}
