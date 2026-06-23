"use client";

/**
 * Design-system stand-in. Mirrors the @atlys/design-system component API
 * (Button props match the real package: variant / color / size / as /
 * fullWidth / leftIcon / rightIcon / loading) using Atlys tokens from
 * app/globals.css.
 *
 * SWAP POINT: once the private package is wired (see README + .npmrc), replace
 * the implementations below with:
 *   export { Button, Card, Text, Select, TextArea, Spinner } from "@atlys/design-system";
 * and adapt the few local-only helpers (Field, Badge) as needed.
 */

import type { CSSProperties, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary";
type ButtonColor = "brand-blue" | "black" | "white" | "red";
type ButtonSize = "sm" | "lg";

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-label="loading"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(255,255,255,0.45)",
        borderTopColor: "currentColor",
        borderRadius: "50%",
        animation: "jiju-spin 0.7s linear infinite",
      }}
    />
  );
}

export function Button({
  variant = "primary",
  color = "brand-blue",
  size = "lg",
  as = "button",
  fullWidth = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  href,
  onClick,
  type = "button",
  children,
}: {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  as?: "button" | "a";
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  children?: ReactNode;
}) {
  const palette: Record<ButtonColor, string> = {
    "brand-blue": "var(--atlys-brand-blue)",
    black: "var(--atlys-black)",
    white: "#ffffff",
    red: "var(--atlys-red)",
  };
  const base = palette[color];
  const isDisabled = disabled || loading;

  const sizing: CSSProperties =
    size === "sm"
      ? { padding: "8px 12px", fontSize: 13 }
      : { padding: "11px 18px", fontSize: 15 };

  let style: CSSProperties = {
    ...sizing,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 600,
    borderRadius: "var(--atlys-radius-sm)",
    cursor: isDisabled ? "default" : "pointer",
    width: fullWidth ? "100%" : undefined,
    opacity: isDisabled ? 0.55 : 1,
    border: "1px solid transparent",
    lineHeight: 1.2,
    transition: "background 120ms ease, opacity 120ms ease",
  };

  if (variant === "primary") {
    style = { ...style, background: base, color: color === "white" ? "var(--atlys-black)" : "#fff" };
  } else if (variant === "secondary") {
    style = { ...style, background: "#fff", color: base, borderColor: "var(--atlys-border)" };
  } else {
    style = { ...style, background: "transparent", color: base };
  }

  const content = (
    <>
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );

  if (as === "a") {
    return (
      <a href={href} style={style} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} style={style} onClick={onClick} disabled={isDisabled}>
      {content}
    </button>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--atlys-border)",
        borderRadius: "var(--atlys-radius)",
        boxShadow: "var(--atlys-shadow)",
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Text({
  as: Tag = "p",
  size = 15,
  weight = 400,
  color = "var(--atlys-text)",
  children,
  style,
}: {
  as?: "p" | "span" | "h1" | "h2" | "h3" | "label" | "div";
  size?: number;
  weight?: number;
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Tag style={{ margin: 0, fontSize: size, fontWeight: weight, color, ...style }}>
      {children}
    </Tag>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--atlys-text)",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span
          style={{
            display: "block",
            fontSize: 12,
            color: "var(--atlys-muted)",
            marginTop: 4,
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--atlys-border)",
  borderRadius: "var(--atlys-radius-sm)",
  fontSize: 14,
  background: "#fff",
  color: "var(--atlys-text)",
};

export function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      style={fieldStyle}
    />
  );
}

export function TextArea(props: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={props.value}
      rows={props.rows ?? 4}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
    />
  );
}

export function Select(props: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      style={fieldStyle}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

type BadgeTone = "neutral" | "warn" | "danger" | "brand" | "good";

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const tones: Record<BadgeTone, CSSProperties> = {
    neutral: { background: "var(--atlys-surface)", color: "var(--atlys-muted)" },
    warn: { background: "#FFF3E0", color: "#9A5B00" },
    danger: { background: "#FDECEC", color: "var(--atlys-red)" },
    brand: { background: "#EAF1FF", color: "var(--atlys-brand-blue)" },
    good: { background: "#E9F7EF", color: "#1E7D44" },
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}
