"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Select,
  Spinner,
  Text,
  TextArea,
  TextInput,
} from "@/components/ds";
import { buildFlags, hasForbiddenDash } from "@/lib/clean";
import { COUNTRIES, GROUPS, WORLD_COUNTRIES } from "@/lib/countries";
import { exportFilename, toMarkdown, toMarkdownWithSchema } from "@/lib/markdown";
import { toScriptTag } from "@/lib/schema";
import type {
  AtlysSource,
  FaqItem,
  GeneratedContent,
  KeywordResult,
  ReviewFlagKind,
} from "@/lib/types";

interface ApiResult {
  content: GeneratedContent;
  keywords: KeywordResult;
  source: AtlysSource;
}

const DESTINATION_OPTIONS = [
  ...GROUPS.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
  ...COUNTRIES.map((c) => ({ value: c.iso2, label: c.name })),
];

const COUNTRY_OPTIONS = WORLD_COUNTRIES.map((c) => ({
  value: c.iso2,
  label: c.name,
}));

const LOCALE_OPTIONS = [
  { value: "en-US", label: "en-US" },
  { value: "en-GB", label: "en-GB" },
  { value: "en-IN", label: "en-IN" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "faqs", label: "FAQs" },
  { value: "blog", label: "Blog (soon)", disabled: true },
];

const FLAG_TONE: Record<ReviewFlagKind, "warn" | "danger" | "neutral"> = {
  "factual-claim": "warn",
  "unsupported-number": "warn",
  "dash-residual": "danger",
  "ai-tell": "neutral",
  "keyword-stuffing": "neutral",
};

export default function Page() {
  const [destination, setDestination] = useState("schengen");
  const [citizenship, setCitizenship] = useState("IN");
  const [residence, setResidence] = useState("AE");
  const [locale, setLocale] = useState("en-US");
  const [contentType, setContentType] = useState("faqs");
  const [count, setCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [toast, setToast] = useState("");

  const facts = result?.source.facts ?? [];

  const currentContent: GeneratedContent | null = useMemo(() => {
    if (!result) return null;
    return { ...result.content, faqs };
  }, [result, faqs]);

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    setFaqs([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, citizenship, residence, locale, contentType, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ? `${data.error}: ${data.detail}` : data.error);
        return;
      }
      setResult(data as ApiResult);
      setFaqs((data as ApiResult).content.faqs);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function updateFaq(id: string, patch: Partial<FaqItem>) {
    setFaqs((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        if (patch.answer !== undefined || patch.question !== undefined) {
          next.reviewFlags = buildFlags(next.answer, next.targetKeywords, facts);
        }
        return next;
      }),
    );
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    flash(`${label} copied`);
  }

  function download() {
    if (!currentContent) return;
    const blob = new Blob([toMarkdownWithSchema(currentContent)], {
      type: "text/markdown",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = exportFilename(currentContent);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const anyDash = faqs.some(
    (f) => hasForbiddenDash(f.question) || hasForbiddenDash(f.answer),
  );

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: "var(--atlys-brand-blue)" }}>FAQs</span>
          <a href="/kb" style={{ color: "var(--atlys-muted)" }}>Knowledge Base →</a>
        </div>
        <Text as="h1" size={30} weight={800}>
          JIJU
        </Text>
        <Text color="var(--atlys-muted)" style={{ marginTop: 6 }}>
          Extensive, keyword-rich, dash-free CLP FAQs grounded on live atlys.com facts.
        </Text>
      </header>

      <Card style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <Field label="Destination" hint="The visa / CLP">
            <Select value={destination} onChange={setDestination} options={DESTINATION_OPTIONS} />
          </Field>
          <Field label="Citizenship" hint="Passport country">
            <Select value={citizenship} onChange={setCitizenship} options={COUNTRY_OPTIONS} />
          </Field>
          <Field label="Residence" hint="Where they live / apply">
            <Select value={residence} onChange={setResidence} options={COUNTRY_OPTIONS} />
          </Field>
          <Field label="Locale">
            <Select value={locale} onChange={setLocale} options={LOCALE_OPTIONS} />
          </Field>
          <Field label="Content type">
            <Select value={contentType} onChange={setContentType} options={CONTENT_TYPE_OPTIONS} />
          </Field>
          <Field label="How many FAQs">
            <TextInput
              type="number"
              value={String(count)}
              onChange={(v) => setCount(Math.max(1, Math.min(15, Number(v) || 1)))}
            />
          </Field>
        </div>
        <div style={{ marginTop: 18 }}>
          <Button onClick={generate} loading={loading} size="lg">
            {loading ? "Generating" : "Generate FAQs"}
          </Button>
        </div>
      </Card>

      {loading && (
        <Card style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center", color: "var(--atlys-brand-blue)" }}>
          <Spinner size={18} />
          <Text color="var(--atlys-muted)">
            Researching keywords, reading atlys.com, and writing extensive FAQs. This can take a minute.
          </Text>
        </Card>
      )}

      {error && (
        <Card style={{ marginBottom: 24, borderColor: "var(--atlys-red)" }}>
          <Text weight={700} color="var(--atlys-red)">Generation failed</Text>
          <Text color="var(--atlys-muted)" style={{ marginTop: 6, fontSize: 14 }}>{error}</Text>
        </Card>
      )}

      {result && currentContent && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <Text weight={700} size={18}>{result.content.entityName} visa</Text>
            <Badge tone={result.keywords.source === "mock" ? "warn" : "brand"}>
              keywords: {result.keywords.source}
            </Badge>
            <Badge tone={anyDash ? "danger" : "good"}>
              {anyDash ? "em/en dash present" : "dash-clean"}
            </Badge>
            {result.source.url && (
              <a href={result.source.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--atlys-brand-blue)" }}>
                source page
              </a>
            )}
          </div>

          <Collapsible title={`Keywords used (${result.keywords.clusters.length} clusters)`}>
            {result.keywords.notes && (
              <Text color="var(--atlys-muted)" style={{ fontSize: 13, marginBottom: 8 }}>{result.keywords.notes}</Text>
            )}
            {result.keywords.clusters.map((c) => (
              <div key={c.topic} style={{ marginBottom: 10 }}>
                <Text weight={600} size={14}>{c.topic}</Text>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {c.keywords.slice(0, 10).map((k) => (
                    <Badge key={k.phrase} tone="neutral">
                      {k.phrase}{k.volume ? ` · ${k.volume}` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </Collapsible>

          <Collapsible title={`Facts from atlys.com (${facts.length})`}>
            {facts.length === 0 ? (
              <Text color="var(--atlys-muted)" style={{ fontSize: 13 }}>
                No structured facts extracted. The model was told not to state specific numbers it cannot ground. Verify any figures manually.
              </Text>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {facts.map((f, i) => (
                  <Badge key={i} tone="neutral">{f.label}: {f.value}</Badge>
                ))}
              </div>
            )}
          </Collapsible>

          <Card style={{ margin: "16px 0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Text weight={600} size={14}>Export:</Text>
            <Button size="sm" variant="secondary" onClick={() => copy(toMarkdown(currentContent), "Markdown")}>Copy Markdown</Button>
            <Button size="sm" variant="secondary" onClick={() => copy(toScriptTag(currentContent.faqs), "JSON-LD")}>Copy JSON-LD</Button>
            <Button size="sm" onClick={download}>Download .md</Button>
            {toast && <Badge tone="good">{toast}</Badge>}
          </Card>

          <div style={{ display: "grid", gap: 16 }}>
            {faqs.map((f, i) => (
              <FaqCard key={f.id} index={i} faq={f} onChange={updateFaq} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ marginBottom: 12, padding: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", textAlign: "left", padding: "14px 20px", background: "transparent",
          border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
          display: "flex", justifyContent: "space-between",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "var(--atlys-muted)" }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div style={{ padding: "0 20px 18px" }}>{children}</div>}
    </Card>
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
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text weight={700} size={13} color="var(--atlys-muted)">FAQ {index + 1}</Text>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={Boolean(faq.approved)}
            onChange={(e) => onChange(faq.id, { approved: e.target.checked })}
          />
          Approved
        </label>
      </div>

      <Field label="Question">
        <TextInput value={faq.question} onChange={(v) => onChange(faq.id, { question: v })} />
      </Field>
      <div style={{ height: 12 }} />
      <Field label="Answer">
        <TextArea value={faq.answer} onChange={(v) => onChange(faq.id, { answer: v })} rows={6} />
      </Field>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        <Badge tone={dash ? "danger" : "good"}>{dash ? "em/en dash" : "dash-clean"}</Badge>
        {faq.reviewFlags.map((flag, i) => (
          <span key={i} title={flag.message}>
            <Badge tone={FLAG_TONE[flag.kind]}>{flag.kind}</Badge>
          </span>
        ))}
        {faq.targetKeywords.slice(0, 8).map((k) => (
          <Badge key={k} tone="brand">{k}</Badge>
        ))}
      </div>
    </Card>
  );
}
