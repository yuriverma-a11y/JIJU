import { describe, expect, it } from "vitest";
import { dedupeQuestions, normalizeQuestion } from "../kb";
import { CATEGORIES, VISA_TYPES, enumerateSlices } from "../kb-taxonomy";
import { toKbJson, toKbMarkdown } from "../kb-export";
import type { KbDataset, KbQuestion } from "../kb-types";

describe("kb normalize + dedupe", () => {
  it("normalizes punctuation and case", () => {
    expect(normalizeQuestion("How much is a France visa?")).toBe(
      "how much is a france visa",
    );
  });

  it("dedupes near-identical questions", () => {
    const items: KbQuestion[] = [
      { id: "1", question: "How much is the fee?", visaType: "Tourist", category: "Fees and payment", source: "generated" },
      { id: "2", question: "How much is the fee???", visaType: "Tourist", category: "Fees and payment", source: "generated" },
      { id: "3", question: "What documents do I need?", visaType: "Tourist", category: "Required documents", source: "generated" },
    ];
    expect(dedupeQuestions(items).length).toBe(2);
  });
});

describe("kb taxonomy", () => {
  it("enumerates visaType × category slices", () => {
    expect(enumerateSlices().length).toBe(VISA_TYPES.length * CATEGORIES.length);
  });
});

describe("kb export", () => {
  const dataset: KbDataset = {
    country: "France",
    applyingFrom: "IN",
    generatedAt: new Date(0).toISOString(),
    questions: [
      { id: "1", question: "How much is the tourist visa fee?", visaType: "Tourist", category: "Fees and payment", source: "generated" },
      { id: "2", question: "Can I work on a student visa?", visaType: "Student", category: "Eligibility", source: "generated" },
      { id: "3", question: "France visa appointment availability", visaType: "General", category: "From search", source: "semrush" },
    ],
  };

  it("renders grouped markdown", () => {
    const md = toKbMarkdown(dataset);
    expect(md).toContain("# France Visa: Knowledge Base");
    expect(md).toContain("## Tourist visa");
    expect(md).toContain("- How much is the tourist visa fee?");
    expect(md).toContain("Other / from search");
  });

  it("renders structured json", () => {
    const data = JSON.parse(toKbJson(dataset));
    expect(data.total).toBe(3);
    expect(data.questions[0].question).toBe("How much is the tourist visa fee?");
  });
});
