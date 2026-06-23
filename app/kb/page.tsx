"use client";

import { useMemo, useRef, useState } from "react";
import { JijuMark } from "@/components/chat";
import { AtlysLogo, TravelIcon } from "@/components/brand";
import { Badge, Button, Field, Select, Spinner, Text, TextInput } from "@/components/ds";
import {
  GLOBAL_AUDIENCE,
  GROUPS,
  WORLD_COUNTRIES,
  countryName as isoName,
  entityDisplayName,
  resolveEntity,
} from "@/lib/countries";
import { countByVisaType, dedupeQuestions } from "@/lib/kb";
import { kbFilename, toKbJson, toKbMarkdown } from "@/lib/kb-export";
import { CATEGORIES, VISA_TYPES } from "@/lib/kb-taxonomy";
import type { KbDataset, KbQuestion } from "@/lib/kb-types";

// How many KB slices to expand at once (independent LLM requests).
const KB_CONCURRENCY = 4;

const DESTINATION_OPTIONS = [
  ...GROUPS.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
  ...WORLD_COUNTRIES.map((c) => ({ value: c.iso2, label: c.name })),
];
// Citizenship / residence: a worldwide audience first, then every country.
const COUNTRY_OPTIONS = [
  { value: GLOBAL_AUDIENCE, label: "Global (any country)" },
  ...WORLD_COUNTRIES.map((c) => ({ value: c.iso2, label: c.name })),
];

/** Read a Response as JSON, tolerating a non-JSON body (e.g. a timeout page). */
async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.trim().slice(0, 140) || `HTTP ${res.status}`;
    return { error: snippet };
  }
}

/* ------------------------------- panel ---------------------------------- */

function Panel({
  label,
  icon,
  children,
  style,
}: {
  label?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--radius)",
        background: "var(--paper-2)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ height: 4, background: "linear-gradient(90deg, var(--brand), var(--sky) 55%, var(--gold))" }} />
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderBottom: "1px solid var(--line)",
            background: "#fcfbf6",
            color: "var(--ink-soft)",
          }}
        >
          {icon}
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            {label}
          </span>
        </div>
      )}
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

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
  const abortRef = useRef<AbortController | null>(null);
  const collectedRef = useRef<KbQuestion[]>([]);

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

  function stop() {
    stopRef.current = true;
    abortRef.current?.abort(); // cancel any in-flight slice immediately
  }

  function sync() {
    setQuestions(dedupeQuestions([...collectedRef.current]));
  }

  async function build() {
    setRunning(true);
    setError("");
    setQuestions([]);
    stopRef.current = false;
    idRef.current = 0;
    collectedRef.current = [];
    const controller = new AbortController();
    abortRef.current = controller;

    // 1) Seed from SEMrush question keywords (best-effort).
    try {
      const r = await fetch("/api/keywords", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destination, residence }),
        signal: controller.signal,
      });
      if (r.ok) {
        const data = await readJson(r);
        for (const cl of data.clusters ?? []) {
          for (const k of cl.keywords ?? []) {
            if (k.isQuestion) {
              collectedRef.current.push({
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
    sync();

    // 2) Expand the selected slices in parallel (a small worker pool) until we
    //    hit the target or run out. Each slice is an independent request, so a
    //    slow or failed one never blocks the others.
    const slices: Array<{ visaType: string; category: string }> = [];
    for (const vt of visaTypes) for (const cat of categories) slices.push({ visaType: vt, category: cat });
    setProgress({ slice: 0, total: slices.length });

    let next = 0;
    let done = 0;
    let lastError = "";

    async function worker() {
      while (!stopRef.current && collectedRef.current.length < targetCount) {
        const i = next++;
        if (i >= slices.length) return;
        const s = slices[i];
        try {
          const avoid = collectedRef.current.slice(-40).map((q) => q.question);
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
            signal: controller.signal,
          });
          const data = await readJson(res);
          if (!res.ok) {
            lastError = data.detail ? `${data.error}: ${data.detail}` : data.error || `HTTP ${res.status}`;
          } else {
            for (const q of data.questions ?? []) {
              collectedRef.current.push({
                id: `q${++idRef.current}`,
                question: q,
                visaType: s.visaType,
                category: s.category,
                source: "generated",
              });
            }
            sync();
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          lastError = String(err);
        } finally {
          done++;
          setProgress({ slice: done, total: slices.length });
        }
      }
    }

    await Promise.all(Array.from({ length: KB_CONCURRENCY }, worker));
    if (lastError && collectedRef.current.length === 0) setError(lastError);
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 22px",
          borderBottom: "1px solid var(--line)",
          background: "rgba(247,243,234,0.78)",
          backdropFilter: "blur(12px)",
        }}
      >
        <JijuMark size={32} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em" }}>JIJU</span>
            <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>Content Studio</span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 5, fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            by <AtlysLogo height={13} />
          </span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-ink)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <TravelIcon name="plane" size={15} /> Back to Studio
          </a>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1040, width: "100%", margin: "0 auto", padding: "28px 24px 80px" }}>
        {/* Dossier hero */}
        <div
          className="jiju-rise"
          style={{
            position: "relative",
            display: "flex",
            gap: 22,
            alignItems: "center",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius)",
            background: "linear-gradient(105deg, var(--ink), #1c2a45)",
            color: "#fff",
            padding: "26px 28px",
            overflow: "hidden",
            boxShadow: "var(--shadow-md)",
            marginBottom: 22,
          }}
        >
          {/* faint dotted globe in the corner */}
          <div aria-hidden style={{ position: "absolute", right: -40, top: -40, opacity: 0.14, color: "#fff" }}>
            <TravelIcon name="globe" size={200} />
          </div>
          <div
            style={{
              flex: "0 0 auto",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <TravelIcon name="passport" size={34} />
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-soft)", marginBottom: 8 }}>
              <TravelIcon name="stamp" size={13} /> Field Dossier
            </div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 34, letterSpacing: "-0.02em", margin: "0 0 8px", lineHeight: 1.05 }}>
              Knowledge Base builder
            </h1>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "rgba(255,255,255,0.74)", maxWidth: 560 }}>
              An exhaustive question bank per destination, for a global audience. Choose how many and what to include, then export Markdown plus JSON for the agent.
            </p>
          </div>
        </div>

        {/* Itinerary: destination + audience */}
        <Panel label="Itinerary" icon={<TravelIcon name="compass" size={15} />} style={{ marginBottom: 16 }}>
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
          <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 999, background: "var(--brand-tint)", color: "var(--brand-ink)", fontSize: 13, fontWeight: 600 }}>
            <strong>{countryName}</strong>
            <span style={{ opacity: 0.55 }}>·</span>
            <span>{isoName(citizenship)}</span>
            <TravelIcon name="plane" size={14} />
            <span>{isoName(residence)}</span>
          </div>
        </Panel>

        {/* Manifest: what to include */}
        <Panel label="Manifest" icon={<TravelIcon name="ticket" size={15} />} style={{ marginBottom: 16 }}>
          <ChipGroup
            label="Visa types to include"
            all={VISA_TYPES}
            selected={visaTypes}
            onToggle={(v) => toggle(visaTypes, setVisaTypes, v)}
            onAll={() => setVisaTypes([...VISA_TYPES])}
            onNone={() => setVisaTypes([])}
          />
          <div style={{ height: 18 }} />
          <ChipGroup
            label="Topics to include"
            all={CATEGORIES}
            selected={categories}
            onToggle={(c) => toggle(categories, setCategories, c)}
            onAll={() => setCategories([...CATEGORIES])}
            onNone={() => setCategories([])}
          />
          <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Button onClick={build} loading={running} disabled={!canBuild}>
              {running ? "Building" : "Build knowledge base"}
            </Button>
            {running && (
              <Button variant="secondary" color="red" onClick={stop}>Stop</Button>
            )}
            <Text color="var(--muted)" style={{ fontSize: 12 }}>
              {visaTypes.length} visa types × {categories.length} topics
            </Text>
          </div>
        </Panel>

        {(running || questions.length > 0) && (
          <Panel label="Boarding status" icon={<TravelIcon name="stamp" size={15} />} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {running && <Spinner size={16} />}
              <Text weight={700}>{questions.length} questions</Text>
              {running && (
                <Text color="var(--muted)" style={{ fontSize: 13 }}>slice {progress.slice}/{progress.total}</Text>
              )}
              <div className="jiju-perforate" style={{ flex: 1, minWidth: 120, height: 6, borderRadius: 999, overflow: "hidden", background: "var(--atlys-surface)", backgroundImage: "none" }}>
                <div style={{ width: `${running ? pct : 100}%`, height: "100%", background: "linear-gradient(90deg, var(--brand), var(--sky))", transition: "width .3s ease" }} />
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
          </Panel>
        )}

        {error && (
          <Panel style={{ marginBottom: 16, borderColor: "var(--red)" }}>
            <Text color="var(--red)" style={{ fontSize: 14 }}>{error}</Text>
          </Panel>
        )}

        {questions.length > 0 && (
          <Panel label={`Manifest preview · first 50 of ${questions.length}`} icon={<TravelIcon name="passport" size={15} />}>
            <ol style={{ margin: 0, paddingLeft: 20, color: "var(--ink)", fontSize: 14, lineHeight: 1.75 }}>
              {questions.slice(0, 50).map((q) => (
                <li key={q.id}>
                  {q.question}{" "}
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>({q.visaType} · {q.category})</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </main>
    </div>
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
                padding: "5px 11px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: on ? "var(--brand)" : "var(--line-strong)",
                background: on ? "var(--brand-tint)" : "rgba(255,255,255,0.6)",
                color: on ? "var(--brand-ink)" : "var(--muted)",
                transition: "all .14s ease",
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
  color: "var(--brand-ink)",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
};
