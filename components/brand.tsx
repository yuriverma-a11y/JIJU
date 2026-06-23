"use client";

/**
 * Shared brand + travel iconography for the JIJU "Departures" theme.
 * Used by the chat studio (app/page.tsx) and the Knowledge Base builder
 * (app/kb/page.tsx) so the two surfaces stay visually identical.
 */

export type TravelIconName = "plane" | "passport" | "globe" | "compass" | "ticket" | "stamp";

export function TravelIcon({ name, size = 22 }: { name: TravelIconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "plane":
      return <svg {...common}><path d="M10.2 13.8 3 12l18-7-4 18-3.5-6.3" /><path d="m13.5 16.7-3.3-2.9" /></svg>;
    case "passport":
      return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9.5 16h5" /></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" /></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2z" /></svg>;
    case "ticket":
      return <svg {...common}><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4z" /><path d="M14 6v12" strokeDasharray="2 2" /></svg>;
    case "stamp":
      return <svg {...common}><path d="M12 3a3 3 0 0 0-3 3c0 1.5 1 2 1 3.5S9 12 7.5 12H6a2 2 0 0 0-2 2v1h16v-1a2 2 0 0 0-2-2h-1.5c-1.5 0-2.5-1-2.5-2.5S15 7.5 15 6a3 3 0 0 0-3-3z" /><path d="M5 19h14" /></svg>;
  }
}

export function AtlysLogo({ height = 22 }: { height?: number }) {
  // Real Atlys wordmark (downloaded to /public/atlys-logo.svg).
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/atlys-logo.svg" alt="Atlys" height={height} style={{ height, width: "auto", display: "block" }} />;
}
