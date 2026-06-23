"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, TextArea, TextInput } from "@/components/ds";
import {
  hasForbiddenDash,
  lintAiTells,
  lintKeywordDensity,
} from "@/lib/clean";
import { countByVisaType } from "@/lib/kb";
import { kbFilename, toKbJson, toKbMarkdown } from "@/lib/kb-export";
import { exportFilename, toMarkdown, toMarkdownWithSchema } from "@/lib/markdown";
import { toScriptTag } from "@/lib/schema";
import type { KbDataset, KbQuestion } from "@/lib/kb-types";
import type { FaqItem, GeneratedContent, ReviewFlag, ReviewFlagKind } from "@/lib/types";

/* ------------------------------- helpers -------------------------------- */

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const FLAG_TONE: Record<ReviewFlagKind, "warn" | "danger" | "neutral"> = {
  "factual-claim": "warn",
  "unsupported-number": "warn",
  "dash-residual": "danger",
  "ai-tell": "neutral",
  "keyword-stuffing": "neutral",
};

function relint(answer: string, keywords: string[]): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  if (hasForbiddenDash(answer))
    flags.push({ kind: "dash-residual", message: "Em or en dash present." });
  flags.push(...lintAiTells(answer));
  flags.push(...lintKeywordDensity(answer, keywords));
  return flags;
}

/* --------------------------------- mark --------------------------------- */

export function JijuMark({ size = 30, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: size * 0.32,
        background: "linear-gradient(140deg, #3a82ff, #1550c8)",
        boxShadow: glow
          ? "0 6px 18px rgba(31,111,255,.40)"
          : "0 2px 6px rgba(31,111,255,.28)",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M12 1.4 L14.1 9.4 L22 12 L14.1 14.6 L12 22.6 L9.9 14.6 L2 12 L9.9 9.4 Z" fill="#fff" />
      </svg>
    </span>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 6, verticalAlign: "middle" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 999,
            background: "var(--brand)",
            animation: `jiju-pulse 1s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function WorkingIndicator({
  status,
  draft,
  intent,
}: {
  status: string;
  draft: string;
  intent: string;
}) {
  const showProse = draft && (intent === "blog" || intent === "freeform");
  return (
    <div className="jiju-rise" style={{ display: "flex", gap: 12 }}>
      <div style={{ animation: "jiju-pulse 1.5s ease-in-out infinite" }}>
        <JijuMark size={30} glow />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
          {status || "Thinking"}
          <Dots />
        </div>
        {showProse && (
          <div
            className="prose-atlys"
            style={{
              marginTop: 12,
              opacity: 0.55,
              maxHeight: 300,
              overflow: "hidden",
              WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent)",
              maskImage: "linear-gradient(to bottom, #000 55%, transparent)",
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
          </div>
        )}
        {draft && intent === "faqs" && (
          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
            Drafting, about {Math.max(1, Math.round(draft.length / 6))} words so far
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- country select --------------------------- */

export interface Option {
  value: string;
  label: string;
}

export function CountrySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options],
  );

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "7px 12px",
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: open ? "var(--brand-tint)" : "#fff",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--ink)",
          maxWidth: "100%",
        }}
      >
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <strong style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
          {current?.label ?? "Select"}
        </strong>
        <span style={{ color: "var(--muted)", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              zIndex: 50,
              width: 260,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}`}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderBottom: "1px solid var(--line)",
                fontSize: 14,
                outline: "none",
              }}
            />
            <div style={{ maxHeight: 260, overflowY: "auto", padding: 4 }}>
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQ("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    background: o.value === value ? "var(--brand-tint)" : "transparent",
                    color: o.value === value ? "var(--brand-ink)" : "var(--ink)",
                    fontWeight: o.value === value ? 600 : 400,
                  }}
                >
                  {o.label}
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 12, color: "var(--muted)", fontSize: 13 }}>No matches</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------ artifact shell -------------------------- */

function Pill({
  onClick,
  children,
  primary,
  href,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  primary?: boolean;
  href?: string;
}) {
  const style: React.CSSProperties = {
    padding: "7px 13px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    borderColor: primary ? "transparent" : "var(--line)",
    background: primary ? "var(--brand)" : "#fff",
    color: primary ? "#fff" : "var(--ink)",
    textDecoration: "none",
    display: "inline-block",
  };
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={style}>{children}</a>;
  return <button type="button" onClick={onClick} style={style}>{children}</button>;
}

function ArtifactShell({
  title,
  meta,
  children,
  footer,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="jiju-rise"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        background: "var(--paper-2)",
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          background: "#fcfbf8",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{title}</span>
        {meta}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
      {footer && (
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--line)",
            background: "#fcfbf8",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState("");
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1500);
  };
  return { toast, flash };
}

/* -------------------------------- FAQ ----------------------------------- */

export function FaqArtifact({
  entityName,
  faqs: initial,
  sourceUrls,
  keywordsSource,
}: {
  entityName: string;
  faqs: FaqItem[];
  sourceUrls: string[];
  keywordsSource: string;
}) {
  const [faqs, setFaqs] = useState<FaqItem[]>(initial);
  const { toast, flash } = useToast();

  const content: GeneratedContent = useMemo(
    () => ({
      request: { destination: entityName, citizenship: "", residence: "", locale: "en-US", contentType: "faqs", count: faqs.length },
      entityName,
      faqs,
      sourceUrls,
      generatedAt: new Date().toISOString(),
    }),
    [faqs, entityName, sourceUrls],
  );

  function update(id: string, patch: Partial<FaqItem>) {
    setFaqs((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        if (patch.answer !== undefined || patch.question !== undefined)
          next.reviewFlags = relint(next.answer, next.targetKeywords);
        return next;
      }),
    );
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    flash(`${label} copied`);
  }

  return (
    <ArtifactShell
      title={`${entityName} visa · ${faqs.length} FAQs`}
      meta={<Badge tone={keywordsSource === "mock" ? "warn" : "brand"}>keywords: {keywordsSource}</Badge>}
      footer={
        <>
          <Pill onClick={() => copy(toMarkdown(content), "Markdown")}>Copy Markdown</Pill>
          <Pill onClick={() => copy(toScriptTag(content.faqs), "JSON-LD")}>Copy JSON-LD</Pill>
          <Pill primary onClick={() => downloadText(exportFilename(content), toMarkdownWithSchema(content), "text/markdown")}>Download .md</Pill>
          {toast && <Badge tone="good">{toast}</Badge>}
        </>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        {faqs.map((f, i) => (
          <FaqCard key={f.id} index={i} faq={f} onChange={update} />
        ))}
      </div>
    </ArtifactShell>
  );
}

function FaqCard({
  index,
  faq,
  onChange,
}: {
  index: number;
  faq: FaqItem;
  onChange: (id: string, patch: Partial<FaqItem>) => void;
}) {
  const dash = hasForbiddenDash(faq.question) || hasForbiddenDash(faq.answer);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)" }}>FAQ {index + 1}</span>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
          <input type="checkbox" checked={Boolean(faq.approved)} onChange={(e) => onChange(faq.id, { approved: e.target.checked })} />
          Approved
        </label>
      </div>
      <TextInput value={faq.question} onChange={(v) => onChange(faq.id, { question: v })} />
      <div style={{ height: 10 }} />
      <TextArea value={faq.answer} onChange={(v) => onChange(faq.id, { answer: v })} rows={6} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        <Badge tone={dash ? "danger" : "good"}>{dash ? "em/en dash" : "dash-clean"}</Badge>
        {faq.reviewFlags.map((flag, i) => (
          <span key={i} title={flag.message}>
            <Badge tone={FLAG_TONE[flag.kind]}>{flag.kind}</Badge>
          </span>
        ))}
        {faq.targetKeywords.slice(0, 6).map((k) => (
          <Badge key={k} tone="brand">{k}</Badge>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Blog ---------------------------------- */

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "atlys-blog";
}

export function BlogArtifact({ title, markdown }: { title: string; markdown: string; sourceUrls?: string[] }) {
  const [tab, setTab] = useState<"read" | "source">("read");
  const { toast, flash } = useToast();
  return (
    <ArtifactShell
      title={title}
      meta={
        <div style={{ display: "inline-flex", gap: 4, marginLeft: "auto" }}>
          {(["read", "source"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid var(--line)",
                cursor: "pointer",
                background: tab === t ? "var(--brand-tint)" : "#fff",
                color: tab === t ? "var(--brand-ink)" : "var(--muted)",
              }}
            >
              {t === "read" ? "Rendered" : "Markdown"}
            </button>
          ))}
        </div>
      }
      footer={
        <>
          <Pill
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
              flash("Markdown copied");
            }}
          >
            Copy Markdown
          </Pill>
          <Pill primary onClick={() => downloadText(`${slugify(title)}.md`, markdown, "text/markdown")}>Download .md</Pill>
          {toast && <Badge tone="good">{toast}</Badge>}
        </>
      }
    >
      {tab === "read" ? (
        <div className="prose-atlys">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55, fontFamily: "ui-monospace, Menlo, monospace", margin: 0 }}>{markdown}</pre>
      )}
    </ArtifactShell>
  );
}

/* --------------------------------- KB ----------------------------------- */

export function KbArtifact({
  country,
  questions,
  partial,
}: {
  country: string;
  questions: KbQuestion[];
  partial: boolean;
}) {
  const { toast, flash } = useToast();
  const dataset: KbDataset = { country, applyingFrom: "", generatedAt: new Date().toISOString(), questions };
  const counts = countByVisaType(questions);
  return (
    <ArtifactShell
      title={`${country} visa · ${questions.length} questions`}
      meta={partial ? <Badge tone="warn">starter batch</Badge> : undefined}
      footer={
        <>
          <Pill
            onClick={async () => {
              await navigator.clipboard.writeText(toKbMarkdown(dataset));
              flash("Markdown copied");
            }}
          >
            Copy Markdown
          </Pill>
          <Pill primary onClick={() => downloadText(kbFilename(dataset, "md"), toKbMarkdown(dataset), "text/markdown")}>Download .md</Pill>
          <Pill onClick={() => downloadText(kbFilename(dataset, "json"), toKbJson(dataset), "application/json")}>Download .json</Pill>
          <Pill href="/kb">Open full builder</Pill>
          {toast && <Badge tone="good">{toast}</Badge>}
        </>
      }
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {Object.entries(counts).map(([vt, n]) => (
          <Badge key={vt} tone="neutral">{vt}: {n}</Badge>
        ))}
      </div>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
        {questions.slice(0, 40).map((q) => (
          <li key={q.id}>
            {q.question}{" "}
            <span style={{ color: "var(--muted)", fontSize: 12 }}>({q.visaType} · {q.category})</span>
          </li>
        ))}
      </ol>
      {questions.length > 40 && (
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
          Showing first 40. Export to get all {questions.length}.
        </div>
      )}
    </ArtifactShell>
  );
}

/* ------------------------------ freeform -------------------------------- */

export function MarkdownArtifact({ markdown }: { markdown: string }) {
  const { toast, flash } = useToast();
  return (
    <ArtifactShell
      title="Draft"
      footer={
        <>
          <Pill
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
              flash("Copied");
            }}
          >
            Copy
          </Pill>
          <Pill primary onClick={() => downloadText("atlys-draft.md", markdown, "text/markdown")}>Download .md</Pill>
          {toast && <Badge tone="good">{toast}</Badge>}
        </>
      }
    >
      <div className="prose-atlys">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </ArtifactShell>
  );
}
