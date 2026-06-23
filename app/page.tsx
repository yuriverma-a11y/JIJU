"use client";

import { useEffect, useRef, useState } from "react";
import {
  BlogArtifact,
  CountrySelect,
  FaqArtifact,
  JijuMark,
  KbArtifact,
  MarkdownArtifact,
  WorkingIndicator,
  type Option,
} from "@/components/chat";
import { AtlysLogo, TravelIcon, type TravelIconName } from "@/components/brand";
import { GROUPS, WORLD_COUNTRIES } from "@/lib/countries";
import type { ChatArtifact } from "@/lib/chat-types";

const DESTINATION_OPTIONS: Option[] = [
  ...GROUPS.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
  ...WORLD_COUNTRIES.map((c) => ({ value: c.iso2, label: c.name })),
];
const COUNTRY_OPTIONS: Option[] = WORLD_COUNTRIES.map((c) => ({ value: c.iso2, label: c.name }));
const LOCALE_OPTIONS: Option[] = [
  { value: "en-US", label: "en-US" },
  { value: "en-GB", label: "en-GB" },
  { value: "en-IN", label: "en-IN" },
];

const INTENTS: Array<{ value: string; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "faqs", label: "FAQs" },
  { value: "blog", label: "Blog" },
  { value: "kb", label: "Knowledge Base" },
  { value: "freeform", label: "Anything" },
];

const EXAMPLES: Array<{ title: string; sub: string; prompt: string; intent: string; code: string; icon: TravelIconName }> = [
  { title: "FAQs for a CLP", sub: "Schengen visa page", prompt: "Draft 10 extensive, keyword-rich FAQs for the Schengen visa page.", intent: "faqs", code: "FAQ", icon: "ticket" },
  { title: "A blog hub", sub: "UK visa, full guide", prompt: "Write a complete UK visa hub blog following the Atlys playbook.", intent: "blog", code: "HUB", icon: "globe" },
  { title: "Knowledge base", sub: "for an AI agent", prompt: "Build a knowledge base of questions for a US visa AI agent.", intent: "kb", code: "KB", icon: "passport" },
  { title: "Anything else", sub: "captions, emails, copy", prompt: "Write 5 punchy Instagram captions for Dubai visa season.", intent: "freeform", code: "ANY", icon: "compass" },
];

interface Msg {
  id: string;
  role: "user" | "assistant";
  text?: string;
  ctx?: { destination: string; citizenship: string; residence: string; intent: string };
  working?: boolean;
  status?: string;
  draft?: string;
  intent?: string;
  artifact?: ChatArtifact;
}

function labelOf(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/* --------------------- hero: animated great-circle arc ------------------- */

function FlightArc() {
  const arc = "M 70 176 Q 380 22 690 152";
  return (
    <svg
      viewBox="0 0 760 210"
      width="100%"
      style={{ maxWidth: 620, display: "block", margin: "0 auto", overflow: "visible" }}
      aria-hidden
    >
      {/* faint full arc */}
      <path d={arc} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" opacity="0.7" />
      {/* drawn dashed route */}
      <path
        d={arc}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="2 9"
        style={{ animation: "jiju-draw 2s ease-out both" }}
        opacity="0.8"
      />
      {/* origin + destination markers */}
      <g>
        <circle cx="70" cy="176" r="6.5" fill="var(--gold)" />
        <circle cx="70" cy="176" r="11" fill="none" stroke="var(--gold)" strokeWidth="1.2" opacity="0.5" />
        <circle cx="690" cy="152" r="6.5" fill="#fff" stroke="var(--brand)" strokeWidth="2.4" />
        <circle cx="690" cy="152" r="11" fill="none" stroke="var(--brand)" strokeWidth="1.2" opacity="0.5" />
      </g>
      {/* plane following the route (SMIL keeps it aligned + auto-rotated) */}
      <g fill="var(--ink)">
        <path d="M2 0l-11 4.5 4-4.5-4-4.5z" transform="translate(0,0)" />
        <animateMotion dur="6.5s" begin="0.4s" repeatCount="indefinite" rotate="auto" path={arc} />
      </g>
    </svg>
  );
}

/* ------------------------------ wax stamp ------------------------------- */

function StampSeal({ size = 116 }: { size?: number }) {
  const ring = "M58,58 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0";
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        color: "var(--stamp)",
        opacity: 0.92,
        transform: "rotate(-9deg)",
        animation: "jiju-stamp 0.85s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      <svg viewBox="0 0 116 116" width={size} height={size}>
        <circle cx="58" cy="58" r="52" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 3.4" />
        <circle cx="58" cy="58" r="44.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <g style={{ transformOrigin: "58px 58px", animation: "jiju-rotate 32s linear infinite" }}>
          <defs><path id="sealring" d={ring} /></defs>
          <text fontSize="8.2" fontWeight={700} letterSpacing="2.4" fontFamily="var(--font-display)" fill="currentColor">
            <textPath href="#sealring" startOffset="0%">ATLYS · CONTENT STUDIO · GROUNDED ON LIVE FACTS · </textPath>
          </text>
        </g>
        <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="58" cy="58" r="13" />
          <path d="M45 58h26M58 45c3.4 3.4 3.4 22.6 0 26M58 45c-3.4 3.4-3.4 22.6 0 26" strokeWidth="1.1" />
        </g>
      </svg>
    </div>
  );
}

export default function Page() {
  const [destination, setDestination] = useState("schengen");
  const [citizenship, setCitizenship] = useState("IN");
  const [residence, setResidence] = useState("AE");
  const [locale, setLocale] = useState("en-US");
  const [intent, setIntent] = useState("auto");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function grow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  function patch(id: string, p: Partial<Msg>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    const uid = `u${messages.length}-${message.length}`;
    const aid = `a${messages.length}-${message.length}`;
    setMessages((prev) => [
      ...prev,
      { id: uid, role: "user", text: message, ctx: { destination, citizenship, residence, intent } },
      { id: aid, role: "assistant", working: true, status: "", draft: "", intent: intent !== "auto" ? intent : "" },
    ]);
    setInput("");
    setSending(true);
    setTimeout(grow, 0);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, destination, citizenship, residence, locale, intent }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        patch(aid, { working: false, text: data.detail ? `${data.error}: ${data.detail}` : data.error || "Request failed" });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let e: any;
          try {
            e = JSON.parse(line);
          } catch {
            continue;
          }
          if (e.type === "status") patch(aid, { status: e.text });
          else if (e.type === "meta") patch(aid, { intent: e.intent });
          else if (e.type === "delta") setMessages((prev) => prev.map((m) => (m.id === aid ? { ...m, draft: (m.draft || "") + e.text } : m)));
          else if (e.type === "message") patch(aid, { text: e.text });
          else if (e.type === "artifact") patch(aid, { artifact: e.artifact, working: false });
          else if (e.type === "error") patch(aid, { working: false, text: e.error });
        }
      }
      patch(aid, { working: false });
    } catch (err) {
      patch(aid, { working: false, text: String(err) });
    } finally {
      setSending(false);
    }
  }

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
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          <a href="/kb" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <TravelIcon name="passport" size={15} /> Knowledge Base builder
          </a>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-ink)", background: "transparent", border: "none", cursor: "pointer" }}
            >
              New trip
            </button>
          )}
        </div>
      </header>

      {/* Conversation */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 16px" }}>
          {messages.length === 0 ? (
            <Hero onPick={(p, it) => { setIntent(it); setInput(p); setTimeout(grow, 0); taRef.current?.focus(); }} />
          ) : (
            <div style={{ display: "grid", gap: 22 }}>
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} m={m} />
                ) : (
                  <AssistantTurn key={m.id} m={m} />
                ),
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer — styled as a boarding pass */}
      <div style={{ position: "sticky", bottom: 0, background: "linear-gradient(to top, var(--paper) 72%, transparent)", padding: "10px 20px 18px" }}>
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius)",
            background: "var(--paper-2)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}
        >
          {/* Boarding-pass header strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              background: "linear-gradient(100deg, var(--ink), #1c2a45)",
              color: "#fff",
            }}
          >
            <TravelIcon name="plane" size={15} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Boarding Pass
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: "0.16em", opacity: 0.7, fontFamily: "ui-monospace, Menlo, monospace" }}>
              JIJU · ATLYS
            </span>
            <span style={{ display: "inline-flex", gap: 1.5 }}>
              {[2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2].map((w, i) => (
                <span key={i} style={{ width: w, height: 14, background: "rgba(255,255,255,0.85)" }} />
              ))}
            </span>
          </div>

          {/* Fields row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 8, padding: "12px 14px 4px" }}>
            <CountrySelect label="Destination" value={destination} options={DESTINATION_OPTIONS} onChange={setDestination} />
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <CountrySelect label="Citizenship" value={citizenship} options={COUNTRY_OPTIONS} onChange={setCitizenship} />
              <span style={{ color: "var(--brand)", display: "inline-flex", alignItems: "center" }}>
                <TravelIcon name="plane" size={16} />
              </span>
              <CountrySelect label="Residence" value={residence} options={COUNTRY_OPTIONS} onChange={setResidence} />
            </div>
            <CountrySelect label="Locale" value={locale} options={LOCALE_OPTIONS} onChange={setLocale} />
          </div>

          {/* Perforated divider */}
          <div className="jiju-perforate" style={{ height: 2, margin: "10px 14px 4px" }} />

          {/* Prompt + actions */}
          <div style={{ padding: "6px 14px 14px" }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                grow();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask JIJU to create anything for Atlys…"
              rows={1}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 16,
                lineHeight: 1.5,
                fontFamily: "var(--font-body)",
                background: "transparent",
                color: "var(--ink)",
                padding: "4px 4px 10px",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {INTENTS.map((it) => (
                  <button
                    key={it.value}
                    onClick={() => setIntent(it.value)}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: intent === it.value ? "transparent" : "var(--line-strong)",
                      background: intent === it.value ? "var(--ink)" : "rgba(255,255,255,0.6)",
                      color: intent === it.value ? "#fff" : "var(--muted)",
                      transition: "all .15s ease",
                    }}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => send(input)}
                disabled={sending || !input.trim()}
                style={{
                  marginLeft: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "none",
                  cursor: sending || !input.trim() ? "default" : "pointer",
                  background: "var(--brand)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  opacity: sending || !input.trim() ? 0.5 : 1,
                  boxShadow: sending || !input.trim() ? "none" : "var(--shadow-brand)",
                }}
              >
                {sending ? "In flight" : "Depart"}
                <TravelIcon name="plane" size={16} />
              </button>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 860, margin: "8px auto 0", textAlign: "center", fontSize: 11.5, color: "var(--muted)" }}>
          JIJU grounds facts on live atlys.com and never uses em or en dashes. Verify figures before publishing.
        </div>
      </div>
    </div>
  );
}

function Hero({ onPick }: { onPick: (prompt: string, intent: string) => void }) {
  return (
    <div className="jiju-rise" style={{ position: "relative", padding: "26px 0 14px" }}>
      {/* Stamp seal, offset top-right */}
      <div style={{ position: "absolute", top: -2, right: 4, zIndex: 2 }}>
        <StampSeal size={120} />
      </div>

      {/* Animated flight arc */}
      <div style={{ marginBottom: -28 }}>
        <FlightArc />
      </div>

      <div style={{ position: "relative", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, border: "1px solid var(--line-strong)", background: "rgba(255,255,255,0.6)", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)" }}>
          <TravelIcon name="compass" size={14} /> Now departing
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 54,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            margin: "16px 0 12px",
            lineHeight: 1.03,
            color: "var(--ink)",
          }}
        >
          What should we
          <br />
          create <span style={{ fontStyle: "italic", color: "var(--brand)" }}>today?</span>
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16.5, margin: "0 auto 30px", maxWidth: 500, lineHeight: 1.6 }}>
          Your concierge for Atlys content. FAQs, blog hubs, or a full knowledge base, grounded on live atlys.com facts and written in the Atlys voice.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, maxWidth: 560, margin: "0 auto" }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.title}
              onClick={() => onPick(ex.prompt, ex.intent)}
              className="jiju-ticket"
              style={{
                position: "relative",
                textAlign: "left",
                padding: 16,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line-strong)",
                background: "var(--paper-2)",
                boxShadow: "var(--shadow-sm)",
                cursor: "pointer",
                overflow: "hidden",
                transition: "transform .14s ease, box-shadow .14s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: 9, background: "var(--brand-tint)", color: "var(--brand-ink)" }}>
                  <TravelIcon name={ex.icon} size={19} />
                </span>
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted)", border: "1px dashed var(--line-strong)", borderRadius: 6, padding: "2px 6px" }}>
                  {ex.code}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{ex.title}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{ex.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ m }: { m: Msg }) {
  const ctx = m.ctx;
  const ctxLine = ctx
    ? [labelOf(DESTINATION_OPTIONS, ctx.destination), `${labelOf(COUNTRY_OPTIONS, ctx.citizenship)} → ${labelOf(COUNTRY_OPTIONS, ctx.residence)}`, ctx.intent !== "auto" ? labelOf(INTENTS, ctx.intent) : null]
        .filter(Boolean)
        .join("  ·  ")
    : "";
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: "82%" }}>
        <div
          style={{
            background: "var(--ink)",
            color: "#fff",
            padding: "11px 15px",
            borderRadius: "16px 16px 4px 16px",
            fontSize: 15,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {m.text}
        </div>
        {ctxLine && (
          <div style={{ textAlign: "right", fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>{ctxLine}</div>
        )}
      </div>
    </div>
  );
}

function AssistantTurn({ m }: { m: Msg }) {
  if (m.working) {
    return <WorkingIndicator status={m.status || ""} draft={m.draft || ""} intent={m.intent || ""} />;
  }
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <JijuMark size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {m.text && <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: m.artifact ? 14 : 0, paddingTop: 4 }}>{m.text}</div>}
        {m.artifact?.type === "faqs" && (
          <FaqArtifact entityName={m.artifact.entityName} faqs={m.artifact.faqs} sourceUrls={m.artifact.sourceUrls} keywordsSource={m.artifact.keywordsSource} />
        )}
        {m.artifact?.type === "blog" && <BlogArtifact title={m.artifact.title} markdown={m.artifact.markdown} sourceUrls={m.artifact.sourceUrls} />}
        {m.artifact?.type === "kb" && <KbArtifact country={m.artifact.country} questions={m.artifact.questions} partial={m.artifact.partial} />}
        {m.artifact?.type === "markdown" && <MarkdownArtifact markdown={m.artifact.markdown} />}
      </div>
    </div>
  );
}
