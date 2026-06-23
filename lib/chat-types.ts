// Types for the chat orchestrator and the artifacts it returns.

import type { KbQuestion } from "./kb-types";
import type { FaqItem } from "./types";

export type ChatIntent = "faqs" | "blog" | "kb" | "freeform";

export type ChatArtifact =
  | {
      type: "faqs";
      entityName: string;
      faqs: FaqItem[];
      sourceUrls: string[];
      keywordsSource: string;
    }
  | { type: "blog"; title: string; markdown: string; sourceUrls: string[] }
  | { type: "kb"; country: string; questions: KbQuestion[]; partial: boolean }
  | { type: "markdown"; markdown: string };

export interface ChatTurnResult {
  intent: ChatIntent;
  message: string;
  artifact?: ChatArtifact;
}

// Streaming events emitted by runChatStream over the NDJSON response.
export type ChatStreamEvent =
  | { type: "status"; text: string }
  | { type: "meta"; intent: ChatIntent }
  | { type: "delta"; text: string }
  | { type: "message"; text: string }
  | { type: "artifact"; artifact: ChatArtifact }
  | { type: "error"; error: string };
