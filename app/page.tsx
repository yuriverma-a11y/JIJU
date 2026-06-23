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
import { COUNTRIES, GROUPS, WORLD_COUNTRIES } from "@/lib/countries";
import type { ChatArtifact } from "@/lib/chat-types";

const DESTINATION_OPTIONS: Option[] = [
  ...GROUPS.map((g) => ({ value: g.id, label: `${g.name} (group)` })),
  ...COUNTRIES.map((c) => ({ value: c.iso2, label: c.name })),
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

const EXAMPLES: Array<{ title: string; sub: string; prompt: string; intent: string }> = [
  { title: "FAQs for a CLP", sub: "Schengen visa page", prompt: "Draft 10 extensive, keyword-rich FAQs for the Schengen visa page.", intent: "faqs" },
  { title: "A blog hub", sub: "UK visa, full guide", prompt: "Write a complete UK visa hub blog following the Atlys playbook.", intent: "blog" },
  { title: "Knowledge base", sub: "for an AI agent", prompt: "Build a knowledge base of questions for a US visa AI agent.", intent: "kb" },
  { title: "Anything else", sub: "captions, emails, copy", prompt: "Write 5 punchy Instagram captions for Dubai visa season.", intent: "freeform" },
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
          gap: 12,
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          background: "rgba(251,250,247,0.82)",
          backdropFilter: "blur(10px)",
        }}
      >
        <JijuMark size={30} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>JIJU</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Atlys Content Studio</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
          <a href="/kb" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>Knowledge Base builder</a>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-ink)", background: "transparent", border: "none", cursor: "pointer" }}
            >
              New
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

      {/* Composer */}
      <div style={{ position: "sticky", bottom: 0, background: "linear-gradient(to top, var(--paper) 70%, transparent)", padding: "10px 20px 18px" }}>
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius)",
            background: "var(--paper-2)",
            boxShadow: "var(--shadow-lg)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <CountrySelect label="Destination" value={destination} options={DESTINATION_OPTIONS} onChange={setDestination} />
            <CountrySelect label="Citizenship" value={citizenship} options={COUNTRY_OPTIONS} onChange={setCitizenship} />
            <CountrySelect label="Residence" value={residence} options={COUNTRY_OPTIONS} onChange={setResidence} />
            <CountrySelect label="Locale" value={locale} options={LOCALE_OPTIONS} onChange={setLocale} />
          </div>
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
              padding: "4px 4px 8px",
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
                    borderColor: intent === it.value ? "transparent" : "var(--line)",
                    background: intent === it.value ? "var(--ink)" : "#fff",
                    color: intent === it.value ? "#fff" : "var(--muted)",
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
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                cursor: sending || !input.trim() ? "default" : "pointer",
                background: "var(--brand)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                opacity: sending || !input.trim() ? 0.5 : 1,
                boxShadow: sending || !input.trim() ? "none" : "var(--shadow-brand)",
              }}
            >
              {sending ? "Working" : "Create"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
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
    <div className="jiju-rise" style={{ textAlign: "center", padding: "48px 0 24px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <JijuMark size={56} glow />
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 10px", lineHeight: 1.05 }}>
        What should we create?
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 16, margin: "0 auto 32px", maxWidth: 520 }}>
        Ask for anything Atlys needs. FAQs, blogs, or a full knowledge base, grounded on live atlys.com facts and written in the Atlys voice.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, maxWidth: 720, margin: "0 auto" }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.title}
            onClick={() => onPick(ex.prompt, ex.intent)}
            style={{
              textAlign: "left",
              padding: 16,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--paper-2)",
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
              transition: "transform .12s ease, box-shadow .12s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
          >
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{ex.title}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>{ex.sub}</div>
          </button>
        ))}
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
