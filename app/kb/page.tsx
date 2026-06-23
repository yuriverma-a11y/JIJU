"use client";

import { useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Select,
  Spinner,
  Text,
  TextInput,
} from "@/components/ds";
import {
  COUNTRIES,
  GROUPS,
  WORLD_COUNTRIES,
  entityDisplayName,
  resolveEntity,
} from "@/lib/countries";
import { countByVisaType, dedupeQuestions } from "@/lib/kb";
import { kbFilename, toKbJson, toKbMarkdown } from "@/lib/kb-export";
import { CATEGORIES, VISA_TYPES } from "@/lib/kb-taxonomy";
import type { KbDataset, KbQuestion } from "@/lib/kb-types";

const DESTINATION_OPTIONS = [
  ...GROUPS.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
  ...COUNTRIES.map((c) => ({ value: c.iso2, label: c.name })),
];
const COUNTRY_OPTIONS = WORLD_COUNTRIES.map((c) => ({ value: c.iso2, label: c.name }));

export default function KbPage() {
  const [destination, setDestination] = useState("schengen");
  const [citizenship, setCitizenship] = useState("IN");
  const [residence, setResidence] = useState("AE");
  const [targetCount, setTargetCount] = useState(500);
  const [visaTypes, setVisaTypes] = useState<string[]>([...VISA_TYPES]);
  const [categories, setCategories] = useState<string[]>([...CATEGORIES]);

  const [running, setRunning] = useState(false);
  const [questions, setQuestions] = useState<KbQuestion[]>([]);
  const [progress, setProgress] = useState({ slice: 0, total: 0 });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const stopRef = useRef(false);
  const idRef = useRef(0);

  const countryName = useMemo(() => {
    const e = resolveEntity(destination);
    return e ? entityDisplayName(e) : destination;
  }, [destination]);

  const dataset: KbDataset = {
    country: countryName,
    applyingFrom: residence,
    generatedAt: new Date().toISOString(),
    questions,
  };
  const counts = countByVisaType(questions);
  const canBuild = visaTypes.length > 0 && categories.length > 0 && !running;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  }

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function build() {
    setRunning(true);
    setError("");
    setQuestions([]);
    stopRef.current = false;
    idRef.current = 0;

    let collected: KbQuestion[] = [];

    // 1) Seed from SEMrush question keywords (best-effort).
    try {
      const r = await fetch("/api/keywords", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, residence }),
      });
      if (r.ok) {
        const data = await r.json();
        for (const cl of data.clusters ?? []) {
          for (const k of cl.keywords ?? []) {
            if (k.isQuestion) {
              collected.push({
                id: `q${++idRef.current}`,
                question: k.phrase,
                visaType: "General",
                category: "From search",
                source: "semrush",
              });
            }
          }
        }
      }
    } catch {
      /* seeding is optional */
    }
    collected = dedupeQuestions(collected);
    setQuestions([...collected]);

    // 2) Expand the selected slices until we hit the target (or run out).
    const slices: Array<{ visaType: string; category: string }> = [];
    for (const vt of visaTypes) for (const cat of categories) slices.push({ visaType: vt, category: cat });
    setProgress({ slice: 0, total: slices.length });

    for (let i = 0; i < slices.length; i++) {
      if (stopRef.current || collected.length >= targetCount) break;
      const s = slices[i];
      setProgress({ slice: i + 1, total: slices.length });
      try {
        const avoid = collected.slice(-40).map((q) => q.question);
        const res = await fetch("/api/kb/expand", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            destination,
            citizenship,
            residence,
            visaType: s.visaType,
            category: s.category,
            count: 30,
            avoid,
          }),
        });
        if (!res.ok) {
          const e = await res.json();
          setError(e.detail ? `${e.error}: ${e.detail}` : e.error);
          if (res.status === 400) break;
          continue;
        }
        const data = await res.json();
        for (const q of data.questions ?? []) {
          collected.push({
            id: `q${++idRef.current}`,
            question: q,
            visaType: s.visaType,
            category: s.category,
            source: "generated",
          });
        }
        collected = dedupeQuestions(collected);
        setQuestions([...collected]);
      } catch (err) {
        setError(String(err));
      }
    }

    setRunning(false);
  }

  function download(ext: "md" | "json") {
    const text = ext === "md" ? toKbMarkdown(dataset) : toKbJson(dataset);
    const blob = new Blob([text], { type: ext === "md" ? "text/markdown" : "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kbFilename(dataset, ext);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pct = progress.total > 0 ? Math.round((progress.slice / progress.total) * 100) : 0;

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <a href="/" style={{ fontSize: 13, color: "var(--atlys-brand-blue)" }}>← FAQs</a>
        <Text as="h1" size={30} weight={800} style={{ marginTop: 8 }}>Knowledge Base</Text>
        <Text color="var(--atlys-muted)" style={{ marginTop: 6 }}>
          Exhaustive question bank per country, for a global audience. Choose how many and what to include, then export Markdown + JSON for the agent.
        </Text>
      </header>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
          <Field label="Destination">
            <Select value={destination} onChange={setDestination} options={DESTINATION_OPTIONS} />
          </Field>
          <Field label="Citizenship">
            <Select value={citizenship} onChange={setCitizenship} options={COUNTRY_OPTIONS} />
          </Field>
          <Field label="Residence">
            <Select value={residence} onChange={setResidence} options={COUNTRY_OPTIONS} />
          </Field>
          <Field label="How many questions" hint="Stops once reached">
            <TextInput
              type="number"
              value={String(targetCount)}
              onChange={(v) => setTargetCount(Math.max(50, Math.min(5000, Number(v) || 50)))}
            />
          </Field>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <ChipGroup
          label="Visa types to include"
          all={VISA_TYPES}
          selected={visaTypes}
          onToggle={(v) => toggle(visaTypes, setVisaTypes, v)}
          onAll={() => setVisaTypes([...VISA_TYPES])}
          onNone={() => setVisaTypes([])}
        />
        <div style={{ height: 16 }} />
        <ChipGroup
          label="Topics to include"
          all={CATEGORIES}
          selected={categories}
          onToggle={(c) => toggle(categories, setCategories, c)}
          onAll={() => setCategories([...CATEGORIES])}
          onNone={() => setCategories([])}
        />
        <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
          <Button onClick={build} loading={running} disabled={!canBuild}>
            {running ? "Building" : "Build knowledge base"}
          </Button>
          {running && (
            <Button variant="secondary" color="red" onClick={() => (stopRef.current = true)}>Stop</Button>
          )}
          <Text color="var(--atlys-muted)" style={{ fontSize: 12 }}>
            {visaTypes.length} visa types × {categories.length} topics
          </Text>
        </div>
      </Card>

      {(running || questions.length > 0) && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {running && <Spinner size={16} />}
            <Text weight={700}>{questions.length} questions</Text>
            {running && (
              <Text color="var(--atlys-muted)" style={{ fontSize: 13 }}>slice {progress.slice}/{progress.total}</Text>
            )}
            <div style={{ flex: 1, minWidth: 120, height: 6, background: "var(--atlys-surface)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${running ? pct : 100}%`, height: "100%", background: "var(--atlys-brand-blue)" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {Object.entries(counts).map(([vt, n]) => (
              <Badge key={vt} tone="neutral">{vt}: {n}</Badge>
            ))}
          </div>
          {questions.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(toKbMarkdown(dataset)); flash("Markdown copied"); }}>Copy Markdown</Button>
              <Button size="sm" onClick={() => download("md")}>Download .md</Button>
              <Button size="sm" onClick={() => download("json")}>Download .json</Button>
              {toast && <Badge tone="good">{toast}</Badge>}
            </div>
          )}
        </Card>
      )}

      {error && (
        <Card style={{ marginBottom: 16, borderColor: "var(--atlys-red)" }}>
          <Text color="var(--atlys-red)" style={{ fontSize: 14 }}>{error}</Text>
        </Card>
      )}

      {questions.length > 0 && (
        <Card>
          <Text weight={700} size={14} style={{ marginBottom: 10 }}>
            Sample (first 50 of {questions.length})
          </Text>
          <ol style={{ margin: 0, paddingLeft: 20, color: "var(--atlys-text)", fontSize: 14, lineHeight: 1.7 }}>
            {questions.slice(0, 50).map((q) => (
              <li key={q.id}>
                {q.question}{" "}
                <span style={{ color: "var(--atlys-muted)", fontSize: 12 }}>({q.visaType} · {q.category})</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </main>
  );
}

function ChipGroup({
  label,
  all,
  selected,
  onToggle,
  onAll,
  onNone,
}: {
  label: string;
  all: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Text weight={600} size={13}>{label}</Text>
        <button onClick={onAll} style={linkBtn}>all</button>
        <button onClick={onNone} style={linkBtn}>none</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {all.map((item) => {
          const on = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: on ? "var(--atlys-brand-blue)" : "var(--atlys-border)",
                background: on ? "#EAF1FF" : "#fff",
                color: on ? "var(--atlys-brand-blue)" : "var(--atlys-muted)",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--atlys-brand-blue)",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
};
