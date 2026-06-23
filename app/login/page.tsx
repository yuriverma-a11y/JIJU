"use client";

import { useState } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Invalid access token.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 360,
          background: "#fff",
          border: "1px solid var(--atlys-border)",
          borderRadius: "var(--atlys-radius)",
          boxShadow: "var(--atlys-shadow)",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
          JIJU
        </h1>
        <p style={{ color: "var(--atlys-muted)", margin: "0 0 16px", fontSize: 14 }}>
          Enter the access token to continue.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Access token"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--atlys-border)",
            borderRadius: "var(--atlys-radius-sm)",
            fontSize: 14,
          }}
        />
        {error && (
          <p style={{ color: "var(--atlys-red)", fontSize: 13, margin: "8px 0 0" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !token}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 12px",
            background: "var(--atlys-brand-blue)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--atlys-radius-sm)",
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy || !token ? 0.6 : 1,
          }}
        >
          {busy ? "Checking..." : "Continue"}
        </button>
      </form>
    </main>
  );
}
