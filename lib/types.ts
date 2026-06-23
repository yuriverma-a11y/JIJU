// Shared types for JIJU.

export type ContentTypeId =
  | "faqs"
  | "hero"
  | "intro"
  | "why-atlys"
  | "documents";

export interface CountryRef {
  type: "country";
  name: string; // "France"
  iso2: string; // "FR"
  slug: string; // CLP path segment used under /{locale}/visa/{slug}
  seedKeywords: string[];
}

export interface GroupRef {
  type: "group";
  id: string; // "schengen"
  name: string; // "Schengen"
  members: string[]; // ISO-2 list
  slug: string; // CLP path segment
  seedKeywords: string[];
}

export type EntityRef = CountryRef | GroupRef;

export interface GenerationRequest {
  destination: string; // country ISO-2 / name, or group id (the CLP)
  citizenship: string; // passport country ISO-2 (tailors requirements)
  residence: string; // country of residence ISO-2 (where to apply + SEMrush region)
  locale: string; // "en-US"
  contentType: ContentTypeId;
  count: number; // number of FAQs
  database?: string; // SEMrush database override
}

export interface KeywordItem {
  phrase: string;
  volume?: number;
  difficulty?: number; // keyword difficulty, %
  cpc?: number;
  intent?: string;
  isQuestion: boolean;
}

export interface KeywordCluster {
  topic: string; // "fees", "documents", "processing time", ...
  keywords: KeywordItem[];
  primaryQuestion?: string;
}

export interface KeywordResult {
  entity: string;
  database: string;
  clusters: KeywordCluster[];
  fetchedAt: string;
  source: "mcp" | "rest" | "mock";
  notes?: string;
}

export interface AtlysFact {
  label: string; // "Visa fee", "Processing time", ...
  value: string; // "€90", "15 calendar days"
  sourceUrl: string;
}

export interface AtlysSource {
  url: string;
  title: string;
  text: string; // extracted readable text used for grounding
  facts: AtlysFact[];
  fetchedAt: string;
}

export type ReviewFlagKind =
  | "factual-claim"
  | "dash-residual"
  | "ai-tell"
  | "keyword-stuffing"
  | "unsupported-number";

export interface ReviewFlag {
  kind: ReviewFlagKind;
  message: string;
  span?: string; // offending text snippet
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  targetKeywords: string[];
  factsUsed: string[]; // fact labels/values referenced
  reviewFlags: ReviewFlag[];
  approved?: boolean;
}

export interface GeneratedContent {
  request: GenerationRequest;
  entityName: string;
  faqs: FaqItem[];
  sourceUrls: string[];
  generatedAt: string;
}
