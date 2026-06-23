// Country + country-group registry and resolver. Pure.
//
// CLP URL pattern (confirmed): https://www.atlys.com/{locale}/visa/{slug}
// Slugs below are best-guess and should be verified against live Atlys URLs;
// the facts fetcher tolerates a 404 and falls back to search.

import type { CountryRef, EntityRef, GroupRef } from "./types";

function seeds(name: string, extra: string[] = []): string[] {
  return [
    `${name} visa`,
    `${name} tourist visa`,
    `${name} visa for indians`,
    `${name} visa requirements`,
    `${name} visa fees`,
    ...extra,
  ];
}

export const COUNTRIES: CountryRef[] = [
  { type: "country", name: "France", iso2: "FR", slug: "france", seedKeywords: seeds("France", ["France Schengen visa"]) },
  { type: "country", name: "Germany", iso2: "DE", slug: "germany", seedKeywords: seeds("Germany", ["Germany Schengen visa"]) },
  { type: "country", name: "Italy", iso2: "IT", slug: "italy", seedKeywords: seeds("Italy") },
  { type: "country", name: "Spain", iso2: "ES", slug: "spain", seedKeywords: seeds("Spain") },
  { type: "country", name: "Netherlands", iso2: "NL", slug: "netherlands", seedKeywords: seeds("Netherlands") },
  { type: "country", name: "Greece", iso2: "GR", slug: "greece", seedKeywords: seeds("Greece") },
  { type: "country", name: "Portugal", iso2: "PT", slug: "portugal", seedKeywords: seeds("Portugal") },
  { type: "country", name: "Switzerland", iso2: "CH", slug: "switzerland", seedKeywords: seeds("Switzerland") },
  { type: "country", name: "United States", iso2: "US", slug: "usa", seedKeywords: seeds("US", ["B1 B2 visa", "US tourist visa", "US visa appointment"]) },
  { type: "country", name: "United Kingdom", iso2: "GB", slug: "uk", seedKeywords: seeds("UK", ["UK standard visitor visa"]) },
  { type: "country", name: "Canada", iso2: "CA", slug: "canada", seedKeywords: seeds("Canada", ["Canada visitor visa"]) },
  { type: "country", name: "Australia", iso2: "AU", slug: "australia", seedKeywords: seeds("Australia", ["Australia visitor visa 600"]) },
  { type: "country", name: "Japan", iso2: "JP", slug: "japan", seedKeywords: seeds("Japan") },
  { type: "country", name: "United Arab Emirates", iso2: "AE", slug: "dubai", seedKeywords: ["Dubai visa", "UAE visa", "Dubai tourist visa", "Dubai visa for indians", "UAE visa fees"] },
  { type: "country", name: "Singapore", iso2: "SG", slug: "singapore", seedKeywords: seeds("Singapore") },
  { type: "country", name: "Thailand", iso2: "TH", slug: "thailand", seedKeywords: seeds("Thailand") },
  { type: "country", name: "Vietnam", iso2: "VN", slug: "vietnam", seedKeywords: seeds("Vietnam", ["Vietnam e-visa"]) },
  { type: "country", name: "Indonesia", iso2: "ID", slug: "bali", seedKeywords: ["Bali visa", "Indonesia visa", "Bali visa on arrival", "Indonesia e-visa"] },
  { type: "country", name: "Turkey", iso2: "TR", slug: "turkey", seedKeywords: seeds("Turkey", ["Turkey e-visa"]) },
  { type: "country", name: "South Korea", iso2: "KR", slug: "south-korea", seedKeywords: seeds("South Korea", ["Korea K-ETA"]) },
  { type: "country", name: "Saudi Arabia", iso2: "SA", slug: "saudi-arabia", seedKeywords: seeds("Saudi Arabia", ["Saudi e-visa", "Umrah visa"]) },
  { type: "country", name: "Malaysia", iso2: "MY", slug: "malaysia", seedKeywords: seeds("Malaysia") },
];

const SCHENGEN_MEMBERS = [
  "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO",
  "SK", "SI", "ES", "SE", "CH",
]; // 29 members (2026)

export const GROUPS: GroupRef[] = [
  {
    type: "group",
    id: "schengen",
    name: "Schengen",
    members: SCHENGEN_MEMBERS,
    slug: "schengen",
    seedKeywords: [
      "Schengen visa",
      "Schengen visa for indians",
      "Schengen visa requirements",
      "Schengen visa fees",
      "Schengen visa appointment",
      "which countries can I visit with a Schengen visa",
    ],
  },
  {
    type: "group",
    id: "gcc",
    name: "GCC",
    members: ["AE", "SA", "QA", "KW", "BH", "OM"],
    slug: "gcc",
    seedKeywords: ["GCC visa", "Gulf visa", "GCC residents visa"],
  },
];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Resolve a target (ISO-2, name, slug, or group id) into an EntityRef. */
export function resolveEntity(target: string): EntityRef | null {
  const t = norm(target);
  const group = GROUPS.find(
    (g) => norm(g.id) === t || norm(g.name) === t || norm(g.slug) === t,
  );
  if (group) return group;
  const country = COUNTRIES.find(
    (c) =>
      norm(c.iso2) === t ||
      norm(c.name) === t ||
      norm(c.slug) === t,
  );
  return country ?? null;
}

/** Member CountryRefs for a group (only those present in the registry). */
export function expandGroupMembers(group: GroupRef): CountryRef[] {
  return group.members
    .map((iso) => COUNTRIES.find((c) => c.iso2 === iso))
    .filter((c): c is CountryRef => Boolean(c));
}

/** The Atlys CLP URL for an entity. */
export function clpUrlFor(
  entity: EntityRef,
  locale: string,
  base = "https://www.atlys.com",
): string {
  return `${base}/${locale}/visa/${entity.slug}`;
}

// Origin country (applying-from) → SEMrush regional database.
const ORIGIN_DB: Record<string, string> = {
  IN: "in",
  US: "us",
  GB: "uk",
  AE: "ae",
  CA: "ca",
  AU: "au",
  SG: "sg",
  DE: "de",
  FR: "fr",
};

export function semrushDatabaseForOrigin(originIso2: string): string {
  return ORIGIN_DB[originIso2.toUpperCase()] ?? "us";
}

// Broad country list for citizenship / residence inputs (global audience).
// SEMrush region falls back to "us" for any code not in ORIGIN_DB.
export const WORLD_COUNTRIES: Array<{ iso2: string; name: string }> = [
  { iso2: "US", name: "United States" },
  { iso2: "GB", name: "United Kingdom" },
  { iso2: "CA", name: "Canada" },
  { iso2: "AU", name: "Australia" },
  { iso2: "IN", name: "India" },
  { iso2: "AE", name: "United Arab Emirates" },
  { iso2: "SG", name: "Singapore" },
  { iso2: "DE", name: "Germany" },
  { iso2: "FR", name: "France" },
  { iso2: "IT", name: "Italy" },
  { iso2: "ES", name: "Spain" },
  { iso2: "NL", name: "Netherlands" },
  { iso2: "CH", name: "Switzerland" },
  { iso2: "SE", name: "Sweden" },
  { iso2: "NO", name: "Norway" },
  { iso2: "DK", name: "Denmark" },
  { iso2: "IE", name: "Ireland" },
  { iso2: "PT", name: "Portugal" },
  { iso2: "GR", name: "Greece" },
  { iso2: "AT", name: "Austria" },
  { iso2: "BE", name: "Belgium" },
  { iso2: "PL", name: "Poland" },
  { iso2: "CZ", name: "Czechia" },
  { iso2: "RO", name: "Romania" },
  { iso2: "TR", name: "Turkey" },
  { iso2: "RU", name: "Russia" },
  { iso2: "UA", name: "Ukraine" },
  { iso2: "SA", name: "Saudi Arabia" },
  { iso2: "QA", name: "Qatar" },
  { iso2: "KW", name: "Kuwait" },
  { iso2: "BH", name: "Bahrain" },
  { iso2: "OM", name: "Oman" },
  { iso2: "EG", name: "Egypt" },
  { iso2: "ZA", name: "South Africa" },
  { iso2: "NG", name: "Nigeria" },
  { iso2: "KE", name: "Kenya" },
  { iso2: "GH", name: "Ghana" },
  { iso2: "MA", name: "Morocco" },
  { iso2: "JP", name: "Japan" },
  { iso2: "KR", name: "South Korea" },
  { iso2: "CN", name: "China" },
  { iso2: "HK", name: "Hong Kong" },
  { iso2: "TW", name: "Taiwan" },
  { iso2: "TH", name: "Thailand" },
  { iso2: "VN", name: "Vietnam" },
  { iso2: "ID", name: "Indonesia" },
  { iso2: "MY", name: "Malaysia" },
  { iso2: "PH", name: "Philippines" },
  { iso2: "BD", name: "Bangladesh" },
  { iso2: "PK", name: "Pakistan" },
  { iso2: "LK", name: "Sri Lanka" },
  { iso2: "NP", name: "Nepal" },
  { iso2: "BR", name: "Brazil" },
  { iso2: "MX", name: "Mexico" },
  { iso2: "AR", name: "Argentina" },
  { iso2: "CL", name: "Chile" },
  { iso2: "CO", name: "Colombia" },
  { iso2: "PE", name: "Peru" },
  { iso2: "NZ", name: "New Zealand" },
  { iso2: "IL", name: "Israel" },
  { iso2: "JO", name: "Jordan" },
  { iso2: "LB", name: "Lebanon" },
  { iso2: "KZ", name: "Kazakhstan" },
  { iso2: "FI", name: "Finland" },
  { iso2: "HU", name: "Hungary" },
];

/** Display name for any ISO-2 (world list first, then destinations, else the code). */
export function countryName(iso2: string): string {
  const u = iso2.toUpperCase();
  const w = WORLD_COUNTRIES.find((c) => c.iso2 === u);
  if (w) return w.name;
  const d = COUNTRIES.find((c) => c.iso2 === u);
  return d ? d.name : iso2;
}

export function entityDisplayName(entity: EntityRef): string {
  return entity.type === "group" ? `${entity.name} Area` : entity.name;
}
