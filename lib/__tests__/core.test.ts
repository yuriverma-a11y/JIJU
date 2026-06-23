import { describe, expect, it } from "vitest";
import {
  cleanAnswer,
  hasForbiddenDash,
  lintAiTells,
  lintKeywordDensity,
  lintUnsupportedNumbers,
  stripDashes,
} from "../clean";
import { buildFaqPageJsonLd } from "../schema";
import { toMarkdown } from "../markdown";
import { resolveEntity, expandGroupMembers } from "../countries";
import type { AtlysFact, GeneratedContent, GroupRef } from "../types";

describe("stripDashes — the headline requirement", () => {
  it("rewrites numeric ranges with 'to'", () => {
    expect(stripDashes("Processing takes 10–15 days")).toBe(
      "Processing takes 10 to 15 days",
    );
  });

  it("rewrites currency ranges", () => {
    expect(stripDashes("The fee is €80–€90")).toBe("The fee is €80 to €90");
  });

  it("turns em-dash parentheticals into commas", () => {
    expect(stripDashes("The fee — about €90 — is fixed")).toBe(
      "The fee, about €90, is fixed",
    );
  });

  it("handles tight em dashes between words", () => {
    expect(stripDashes("fast—reliable")).toBe("fast, reliable");
  });

  it("handles the -- substitute", () => {
    expect(stripDashes("apply now -- it is quick")).toBe(
      "apply now, it is quick",
    );
  });

  it("leaves clean text untouched", () => {
    const clean = "You can apply online in minutes.";
    expect(stripDashes(clean)).toBe(clean);
  });

  it("guarantees no forbidden dash survives", () => {
    const messy =
      "Visa fees range €80–€90 — processing is 10–15 days -- usually faster.";
    const out = cleanAnswer(messy);
    expect(hasForbiddenDash(out)).toBe(false);
  });
});

describe("linters", () => {
  it("flags AI tells", () => {
    const flags = lintAiTells(
      "In today's world, navigating the visa process is seamless.",
    );
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every((f) => f.kind === "ai-tell")).toBe(true);
  });

  it("flags keyword stuffing", () => {
    const text =
      "Schengen visa Schengen visa Schengen visa Schengen visa for you.";
    const flags = lintKeywordDensity(text, ["Schengen visa"], 3);
    expect(flags.some((f) => f.kind === "keyword-stuffing")).toBe(true);
  });

  it("flags numbers not present in facts", () => {
    const facts: AtlysFact[] = [
      { label: "Visa fee", value: "€90", sourceUrl: "x" },
    ];
    const flags = lintUnsupportedNumbers(
      "The fee is €90 and it takes 17 days.",
      facts,
    );
    // €90 is grounded; 17 is not.
    expect(flags.some((f) => f.span?.includes("17"))).toBe(true);
    expect(flags.some((f) => f.span?.includes("90"))).toBe(false);
  });
});

describe("schema", () => {
  it("builds FAQPage JSON-LD", () => {
    const ld = buildFaqPageJsonLd([
      {
        id: "1",
        question: "How much is the fee?",
        answer: "It is €90.",
        targetKeywords: [],
        factsUsed: [],
        reviewFlags: [],
      },
    ]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]["@type"]).toBe("Question");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("It is €90.");
  });
});

describe("markdown", () => {
  it("renders question headings", () => {
    const content: GeneratedContent = {
      request: {
        destination: "FR",
        citizenship: "IN",
        residence: "AE",
        locale: "en-US",
        contentType: "faqs",
        count: 1,
      },
      entityName: "France",
      faqs: [
        {
          id: "1",
          question: "Do I need travel insurance?",
          answer: "Yes, you need cover of at least €30,000.",
          targetKeywords: [],
          factsUsed: [],
          reviewFlags: [],
        },
      ],
      sourceUrls: [],
      generatedAt: new Date(0).toISOString(),
    };
    const md = toMarkdown(content);
    expect(md).toContain("### Do I need travel insurance?");
    expect(md).toContain("France Visa");
  });
});

describe("registry", () => {
  it("resolves countries and groups", () => {
    expect(resolveEntity("FR")?.name).toBe("France");
    expect(resolveEntity("schengen")?.type).toBe("group");
    const dubai = resolveEntity("Dubai");
    expect(dubai && dubai.type === "country" && dubai.iso2).toBe("AE");
    expect(resolveEntity("nonsense")).toBeNull();
  });

  it("expands Schengen members", () => {
    const schengen = resolveEntity("schengen") as GroupRef;
    expect(schengen.members.length).toBe(29);
    expect(expandGroupMembers(schengen).length).toBeGreaterThan(0);
  });
});
