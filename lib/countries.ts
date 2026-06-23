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

/** URL-safe CLP slug from a country name (fallback for non-curated countries). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

/** Build a CountryRef for any ISO-2 in the world list (generic slug + seeds). */
function buildCountryRef(iso2: string): CountryRef | null {
  const c = ALL_COUNTRIES.find((x) => x.iso2 === iso2.toUpperCase());
  if (!c) return null;
  return {
    type: "country",
    name: c.name,
    iso2: c.iso2,
    slug: slugify(c.name),
    seedKeywords: seeds(c.name),
  };
}

/**
 * Resolve a target (ISO-2, name, slug, or group id) into an EntityRef.
 * Curated destinations (with hand-tuned slugs/keywords) win; any other country
 * in the world falls back to a generated CountryRef so every country resolves.
 */
export function resolveEntity(target: string): EntityRef | null {
  const t = norm(target);
  if (!t) return null;
  const group = GROUPS.find(
    (g) => norm(g.id) === t || norm(g.name) === t || norm(g.slug) === t,
  );
  if (group) return group;
  const curated = COUNTRIES.find(
    (c) =>
      norm(c.iso2) === t ||
      norm(c.name) === t ||
      norm(c.slug) === t,
  );
  if (curated) return curated;
  // Fall back to the full world list (match by ISO-2 or name).
  const world = ALL_COUNTRIES.find(
    (c) => norm(c.iso2) === t || norm(c.name) === t,
  );
  return world ? buildCountryRef(world.iso2) : null;
}

/** Member CountryRefs for a group (curated entry if present, else generated). */
export function expandGroupMembers(group: GroupRef): CountryRef[] {
  return group.members
    .map((iso) => COUNTRIES.find((c) => c.iso2 === iso) ?? buildCountryRef(iso))
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

// Complete ISO 3166-1 country list (UN members + Vatican, Palestine, Taiwan,
// Hong Kong, Macau), alphabetical by name. Used to resolve any destination,
// citizenship, or residence. SEMrush region falls back to "us" for any code
// not in ORIGIN_DB.
export const ALL_COUNTRIES: Array<{ iso2: string; name: string }> = [
  { iso2: "AF", name: "Afghanistan" },
  { iso2: "AL", name: "Albania" },
  { iso2: "DZ", name: "Algeria" },
  { iso2: "AD", name: "Andorra" },
  { iso2: "AO", name: "Angola" },
  { iso2: "AG", name: "Antigua and Barbuda" },
  { iso2: "AR", name: "Argentina" },
  { iso2: "AM", name: "Armenia" },
  { iso2: "AU", name: "Australia" },
  { iso2: "AT", name: "Austria" },
  { iso2: "AZ", name: "Azerbaijan" },
  { iso2: "BS", name: "Bahamas" },
  { iso2: "BH", name: "Bahrain" },
  { iso2: "BD", name: "Bangladesh" },
  { iso2: "BB", name: "Barbados" },
  { iso2: "BY", name: "Belarus" },
  { iso2: "BE", name: "Belgium" },
  { iso2: "BZ", name: "Belize" },
  { iso2: "BJ", name: "Benin" },
  { iso2: "BT", name: "Bhutan" },
  { iso2: "BO", name: "Bolivia" },
  { iso2: "BA", name: "Bosnia and Herzegovina" },
  { iso2: "BW", name: "Botswana" },
  { iso2: "BR", name: "Brazil" },
  { iso2: "BN", name: "Brunei" },
  { iso2: "BG", name: "Bulgaria" },
  { iso2: "BF", name: "Burkina Faso" },
  { iso2: "BI", name: "Burundi" },
  { iso2: "CV", name: "Cabo Verde" },
  { iso2: "KH", name: "Cambodia" },
  { iso2: "CM", name: "Cameroon" },
  { iso2: "CA", name: "Canada" },
  { iso2: "CF", name: "Central African Republic" },
  { iso2: "TD", name: "Chad" },
  { iso2: "CL", name: "Chile" },
  { iso2: "CN", name: "China" },
  { iso2: "CO", name: "Colombia" },
  { iso2: "KM", name: "Comoros" },
  { iso2: "CG", name: "Congo (Republic)" },
  { iso2: "CD", name: "Congo (DRC)" },
  { iso2: "CR", name: "Costa Rica" },
  { iso2: "CI", name: "Cote d'Ivoire" },
  { iso2: "HR", name: "Croatia" },
  { iso2: "CU", name: "Cuba" },
  { iso2: "CY", name: "Cyprus" },
  { iso2: "CZ", name: "Czechia" },
  { iso2: "DK", name: "Denmark" },
  { iso2: "DJ", name: "Djibouti" },
  { iso2: "DM", name: "Dominica" },
  { iso2: "DO", name: "Dominican Republic" },
  { iso2: "EC", name: "Ecuador" },
  { iso2: "EG", name: "Egypt" },
  { iso2: "SV", name: "El Salvador" },
  { iso2: "GQ", name: "Equatorial Guinea" },
  { iso2: "ER", name: "Eritrea" },
  { iso2: "EE", name: "Estonia" },
  { iso2: "SZ", name: "Eswatini" },
  { iso2: "ET", name: "Ethiopia" },
  { iso2: "FJ", name: "Fiji" },
  { iso2: "FI", name: "Finland" },
  { iso2: "FR", name: "France" },
  { iso2: "GA", name: "Gabon" },
  { iso2: "GM", name: "Gambia" },
  { iso2: "GE", name: "Georgia" },
  { iso2: "DE", name: "Germany" },
  { iso2: "GH", name: "Ghana" },
  { iso2: "GR", name: "Greece" },
  { iso2: "GD", name: "Grenada" },
  { iso2: "GT", name: "Guatemala" },
  { iso2: "GN", name: "Guinea" },
  { iso2: "GW", name: "Guinea-Bissau" },
  { iso2: "GY", name: "Guyana" },
  { iso2: "HT", name: "Haiti" },
  { iso2: "HN", name: "Honduras" },
  { iso2: "HK", name: "Hong Kong" },
  { iso2: "HU", name: "Hungary" },
  { iso2: "IS", name: "Iceland" },
  { iso2: "IN", name: "India" },
  { iso2: "ID", name: "Indonesia" },
  { iso2: "IR", name: "Iran" },
  { iso2: "IQ", name: "Iraq" },
  { iso2: "IE", name: "Ireland" },
  { iso2: "IL", name: "Israel" },
  { iso2: "IT", name: "Italy" },
  { iso2: "JM", name: "Jamaica" },
  { iso2: "JP", name: "Japan" },
  { iso2: "JO", name: "Jordan" },
  { iso2: "KZ", name: "Kazakhstan" },
  { iso2: "KE", name: "Kenya" },
  { iso2: "KI", name: "Kiribati" },
  { iso2: "KP", name: "North Korea" },
  { iso2: "KR", name: "South Korea" },
  { iso2: "KW", name: "Kuwait" },
  { iso2: "KG", name: "Kyrgyzstan" },
  { iso2: "LA", name: "Laos" },
  { iso2: "LV", name: "Latvia" },
  { iso2: "LB", name: "Lebanon" },
  { iso2: "LS", name: "Lesotho" },
  { iso2: "LR", name: "Liberia" },
  { iso2: "LY", name: "Libya" },
  { iso2: "LI", name: "Liechtenstein" },
  { iso2: "LT", name: "Lithuania" },
  { iso2: "LU", name: "Luxembourg" },
  { iso2: "MO", name: "Macau" },
  { iso2: "MG", name: "Madagascar" },
  { iso2: "MW", name: "Malawi" },
  { iso2: "MY", name: "Malaysia" },
  { iso2: "MV", name: "Maldives" },
  { iso2: "ML", name: "Mali" },
  { iso2: "MT", name: "Malta" },
  { iso2: "MH", name: "Marshall Islands" },
  { iso2: "MR", name: "Mauritania" },
  { iso2: "MU", name: "Mauritius" },
  { iso2: "MX", name: "Mexico" },
  { iso2: "FM", name: "Micronesia" },
  { iso2: "MD", name: "Moldova" },
  { iso2: "MC", name: "Monaco" },
  { iso2: "MN", name: "Mongolia" },
  { iso2: "ME", name: "Montenegro" },
  { iso2: "MA", name: "Morocco" },
  { iso2: "MZ", name: "Mozambique" },
  { iso2: "MM", name: "Myanmar" },
  { iso2: "NA", name: "Namibia" },
  { iso2: "NR", name: "Nauru" },
  { iso2: "NP", name: "Nepal" },
  { iso2: "NL", name: "Netherlands" },
  { iso2: "NZ", name: "New Zealand" },
  { iso2: "NI", name: "Nicaragua" },
  { iso2: "NE", name: "Niger" },
  { iso2: "NG", name: "Nigeria" },
  { iso2: "MK", name: "North Macedonia" },
  { iso2: "NO", name: "Norway" },
  { iso2: "OM", name: "Oman" },
  { iso2: "PK", name: "Pakistan" },
  { iso2: "PW", name: "Palau" },
  { iso2: "PS", name: "Palestine" },
  { iso2: "PA", name: "Panama" },
  { iso2: "PG", name: "Papua New Guinea" },
  { iso2: "PY", name: "Paraguay" },
  { iso2: "PE", name: "Peru" },
  { iso2: "PH", name: "Philippines" },
  { iso2: "PL", name: "Poland" },
  { iso2: "PT", name: "Portugal" },
  { iso2: "QA", name: "Qatar" },
  { iso2: "RO", name: "Romania" },
  { iso2: "RU", name: "Russia" },
  { iso2: "RW", name: "Rwanda" },
  { iso2: "KN", name: "Saint Kitts and Nevis" },
  { iso2: "LC", name: "Saint Lucia" },
  { iso2: "VC", name: "Saint Vincent and the Grenadines" },
  { iso2: "WS", name: "Samoa" },
  { iso2: "SM", name: "San Marino" },
  { iso2: "ST", name: "Sao Tome and Principe" },
  { iso2: "SA", name: "Saudi Arabia" },
  { iso2: "SN", name: "Senegal" },
  { iso2: "RS", name: "Serbia" },
  { iso2: "SC", name: "Seychelles" },
  { iso2: "SL", name: "Sierra Leone" },
  { iso2: "SG", name: "Singapore" },
  { iso2: "SK", name: "Slovakia" },
  { iso2: "SI", name: "Slovenia" },
  { iso2: "SB", name: "Solomon Islands" },
  { iso2: "SO", name: "Somalia" },
  { iso2: "ZA", name: "South Africa" },
  { iso2: "SS", name: "South Sudan" },
  { iso2: "ES", name: "Spain" },
  { iso2: "LK", name: "Sri Lanka" },
  { iso2: "SD", name: "Sudan" },
  { iso2: "SR", name: "Suriname" },
  { iso2: "SE", name: "Sweden" },
  { iso2: "CH", name: "Switzerland" },
  { iso2: "SY", name: "Syria" },
  { iso2: "TW", name: "Taiwan" },
  { iso2: "TJ", name: "Tajikistan" },
  { iso2: "TZ", name: "Tanzania" },
  { iso2: "TH", name: "Thailand" },
  { iso2: "TL", name: "Timor-Leste" },
  { iso2: "TG", name: "Togo" },
  { iso2: "TO", name: "Tonga" },
  { iso2: "TT", name: "Trinidad and Tobago" },
  { iso2: "TN", name: "Tunisia" },
  { iso2: "TR", name: "Turkey" },
  { iso2: "TM", name: "Turkmenistan" },
  { iso2: "TV", name: "Tuvalu" },
  { iso2: "UG", name: "Uganda" },
  { iso2: "UA", name: "Ukraine" },
  { iso2: "AE", name: "United Arab Emirates" },
  { iso2: "GB", name: "United Kingdom" },
  { iso2: "US", name: "United States" },
  { iso2: "UY", name: "Uruguay" },
  { iso2: "UZ", name: "Uzbekistan" },
  { iso2: "VU", name: "Vanuatu" },
  { iso2: "VA", name: "Vatican City" },
  { iso2: "VE", name: "Venezuela" },
  { iso2: "VN", name: "Vietnam" },
  { iso2: "YE", name: "Yemen" },
  { iso2: "ZM", name: "Zambia" },
  { iso2: "ZW", name: "Zimbabwe" },
];

// Frequently used passports/residences, surfaced at the top of the pickers.
const PRIORITY_ISO = [
  "IN", "US", "GB", "AE", "CA", "AU", "SG", "DE", "FR", "IT",
  "ES", "NL", "CH", "SA", "QA", "JP", "KR", "CN", "TH", "ID",
];

// Citizenship / residence options: priority countries first, then the rest
// alphabetically. Same shape and full coverage as ALL_COUNTRIES.
export const WORLD_COUNTRIES: Array<{ iso2: string; name: string }> = [
  ...PRIORITY_ISO.map((iso) => ALL_COUNTRIES.find((c) => c.iso2 === iso)!).filter(Boolean),
  ...ALL_COUNTRIES.filter((c) => !PRIORITY_ISO.includes(c.iso2)),
];

// Sentinel value for a worldwide audience (KB citizenship/residence pickers).
export const GLOBAL_AUDIENCE = "GLOBAL";

/** Display name for any ISO-2 (world list first, then destinations, else the code). */
export function countryName(iso2: string): string {
  const u = iso2.toUpperCase();
  if (u === GLOBAL_AUDIENCE) return "a global audience";
  const w = WORLD_COUNTRIES.find((c) => c.iso2 === u);
  if (w) return w.name;
  const d = COUNTRIES.find((c) => c.iso2 === u);
  return d ? d.name : iso2;
}

export function entityDisplayName(entity: EntityRef): string {
  return entity.type === "group" ? `${entity.name} Area` : entity.name;
}
