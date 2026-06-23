// Knowledge Base types. The KB is an exhaustive per-country bank of applicant
// questions, exported as files (Markdown + structured JSON) for engineers and a
// future AI agent. No database.

export interface KbQuestion {
  id: string;
  question: string;
  visaType: string; // from the taxonomy, or "General" for search-seeded
  category: string; // from the taxonomy, or "From search"
  source: "semrush" | "generated";
}

export interface KbDataset {
  country: string;
  applyingFrom: string;
  generatedAt: string;
  questions: KbQuestion[];
}
