/**
 * Continent metadata + ISO-2 → continent lookup.
 *
 * Used by the Discover Map screen (sub-plan 14) to:
 *   1. Render continent-level zoom presets (the bbox values feed the d3-zoom
 *      transform).
 *   2. Group/colour pins by continent.
 *
 * Continent definitions (6 buckets — antarctica is omitted as no users live
 * there and Antarctica's ISO codes "AQ", "BV", "GS", "HM", "TF" are bucketed
 * to the nearest inhabited continent or "oceania" for the Indian-Ocean
 * sub-antarctic islands; see ISO_TO_CONTINENT for exact mapping):
 *
 *   africa        north +37, south -35, west -18, east  +52
 *   asia          north +78, south -12, west +26, east +180
 *   europe        north +71, south +35, west -25, east  +60
 *   north-america north +84, south  +5, west -170, east -50
 *   south-america north +13, south -56, west -82, east  -34
 *   oceania       north  +6, south -47, west +110, east +180
 *
 * Caribbean nations (BB, JM, TT, DM, GD, KN, LC, VC, AG, BS, and the rest of
 * the Antilles) bucket to north-america per the Bumpy convention referenced
 * in the sub-plan-14 spec.
 *
 * Data sourced from the standard UN M.49 + UN Statistics Division geoscheme,
 * adapted to the 6-continent presentation model used elsewhere in the app.
 */

export type Continent =
  | "africa"
  | "asia"
  | "europe"
  | "north-america"
  | "south-america"
  | "oceania";

export type BBox = {
  /** Maximum latitude in degrees (positive = north of equator). */
  north: number;
  /** Minimum latitude in degrees (negative = south of equator). */
  south: number;
  /** Minimum longitude in degrees (negative = west of prime meridian). */
  west: number;
  /** Maximum longitude in degrees. */
  east: number;
};

export type ContinentMeta = {
  id: Continent;
  label: string;
  bbox: BBox;
};

export const CONTINENTS: ReadonlyArray<ContinentMeta> = [
  {
    id: "africa",
    label: "Africa",
    bbox: { north: 37, south: -35, west: -18, east: 52 },
  },
  {
    id: "asia",
    label: "Asia",
    bbox: { north: 78, south: -12, west: 26, east: 180 },
  },
  {
    id: "europe",
    label: "Europe",
    bbox: { north: 71, south: 35, west: -25, east: 60 },
  },
  {
    id: "north-america",
    label: "North America",
    bbox: { north: 84, south: 5, west: -170, east: -50 },
  },
  {
    id: "south-america",
    label: "South America",
    bbox: { north: 13, south: -56, west: -82, east: -34 },
  },
  {
    id: "oceania",
    label: "Oceania",
    bbox: { north: 6, south: -47, west: 110, east: 180 },
  },
];

/**
 * ISO-2 → continent map. Every code in {@link ALL_COUNTRIES} (250 entries)
 * is classified here.
 *
 * Convention notes:
 * - Caribbean groups under `north-america` per Bumpy convention.
 * - Russia (RU), Turkey (TR), Cyprus (CY), Armenia (AM), Azerbaijan (AZ),
 *   Georgia (GE), Kazakhstan (KZ) — transcontinental — bucket to the
 *   continent containing the majority of their territory.
 * - Indian-Ocean French territories (RE, YT, TF) and Comoros (KM) bucket
 *   to Africa.
 * - Antarctica (AQ) and sub-antarctic islands (BV, GS, HM) bucket to the
 *   nearest inhabited continent (south-america/oceania/africa) so they
 *   render on a non-Antarctica map.
 */
export const ISO_TO_CONTINENT: Readonly<Record<string, Continent>> = {
  AD: "europe",
  AE: "asia",
  AF: "asia",
  AG: "north-america",
  AI: "north-america",
  AL: "europe",
  AM: "asia",
  AO: "africa",
  AQ: "south-america", // Antarctica — bucketed for map rendering only
  AR: "south-america",
  AS: "oceania",
  AT: "europe",
  AU: "oceania",
  AW: "north-america",
  AX: "europe",
  AZ: "asia",
  BA: "europe",
  BB: "north-america",
  BD: "asia",
  BE: "europe",
  BF: "africa",
  BG: "europe",
  BH: "asia",
  BI: "africa",
  BJ: "africa",
  BL: "north-america",
  BM: "north-america",
  BN: "asia",
  BO: "south-america",
  BQ: "north-america",
  BR: "south-america",
  BS: "north-america",
  BT: "asia",
  BV: "south-america", // sub-antarctic Norwegian island; bucketed for rendering
  BW: "africa",
  BY: "europe",
  BZ: "north-america",
  CA: "north-america",
  CC: "oceania",
  CD: "africa",
  CF: "africa",
  CG: "africa",
  CH: "europe",
  CI: "africa",
  CK: "oceania",
  CL: "south-america",
  CM: "africa",
  CN: "asia",
  CO: "south-america",
  CR: "north-america",
  CU: "north-america",
  CV: "africa",
  CW: "north-america",
  CX: "oceania",
  CY: "asia",
  CZ: "europe",
  DE: "europe",
  DJ: "africa",
  DK: "europe",
  DM: "north-america",
  DO: "north-america",
  DZ: "africa",
  EC: "south-america",
  EE: "europe",
  EG: "africa",
  EH: "africa",
  ER: "africa",
  ES: "europe",
  ET: "africa",
  FI: "europe",
  FJ: "oceania",
  FK: "south-america",
  FM: "oceania",
  FO: "europe",
  FR: "europe",
  GA: "africa",
  GB: "europe",
  GD: "north-america",
  GE: "asia",
  GF: "south-america",
  GG: "europe",
  GH: "africa",
  GI: "europe",
  GL: "north-america",
  GM: "africa",
  GN: "africa",
  GP: "north-america",
  GQ: "africa",
  GR: "europe",
  GS: "south-america", // sub-antarctic; bucketed
  GT: "north-america",
  GU: "oceania",
  GW: "africa",
  GY: "south-america",
  HK: "asia",
  HM: "oceania", // Heard & McDonald Islands; sub-antarctic Australian territory
  HN: "north-america",
  HR: "europe",
  HT: "north-america",
  HU: "europe",
  ID: "asia",
  IE: "europe",
  IL: "asia",
  IM: "europe",
  IN: "asia",
  IO: "asia", // British Indian Ocean Territory — Chagos archipelago
  IQ: "asia",
  IR: "asia",
  IS: "europe",
  IT: "europe",
  JE: "europe",
  JM: "north-america",
  JO: "asia",
  JP: "asia",
  KE: "africa",
  KG: "asia",
  KH: "asia",
  KI: "oceania",
  KM: "africa",
  KN: "north-america",
  KP: "asia",
  KR: "asia",
  KW: "asia",
  KY: "north-america",
  KZ: "asia",
  LA: "asia",
  LB: "asia",
  LC: "north-america",
  LI: "europe",
  LK: "asia",
  LR: "africa",
  LS: "africa",
  LT: "europe",
  LU: "europe",
  LV: "europe",
  LY: "africa",
  MA: "africa",
  MC: "europe",
  MD: "europe",
  ME: "europe",
  MF: "north-america",
  MG: "africa",
  MH: "oceania",
  MK: "europe",
  ML: "africa",
  MM: "asia",
  MN: "asia",
  MO: "asia",
  MP: "oceania",
  MQ: "north-america",
  MR: "africa",
  MS: "north-america",
  MT: "europe",
  MU: "africa",
  MV: "asia",
  MW: "africa",
  MX: "north-america",
  MY: "asia",
  MZ: "africa",
  NA: "africa",
  NC: "oceania",
  NE: "africa",
  NF: "oceania",
  NG: "africa",
  NI: "north-america",
  NL: "europe",
  NO: "europe",
  NP: "asia",
  NR: "oceania",
  NU: "oceania",
  NZ: "oceania",
  OM: "asia",
  PA: "north-america",
  PE: "south-america",
  PF: "oceania",
  PG: "oceania",
  PH: "asia",
  PK: "asia",
  PL: "europe",
  PM: "north-america",
  PN: "oceania",
  PR: "north-america",
  PS: "asia",
  PT: "europe",
  PW: "oceania",
  PY: "south-america",
  QA: "asia",
  RE: "africa",
  RO: "europe",
  RS: "europe",
  RU: "europe",
  RW: "africa",
  SA: "asia",
  SB: "oceania",
  SC: "africa",
  SD: "africa",
  SE: "europe",
  SG: "asia",
  SH: "africa",
  SI: "europe",
  SJ: "europe",
  SK: "europe",
  SL: "africa",
  SM: "europe",
  SN: "africa",
  SO: "africa",
  SR: "south-america",
  SS: "africa",
  ST: "africa",
  SV: "north-america",
  SX: "north-america",
  SY: "asia",
  SZ: "africa",
  TC: "north-america",
  TD: "africa",
  TF: "africa", // French Southern Territories — Indian Ocean clusters
  TG: "africa",
  TH: "asia",
  TJ: "asia",
  TK: "oceania",
  TL: "asia",
  TM: "asia",
  TN: "africa",
  TO: "oceania",
  TR: "asia",
  TT: "north-america",
  TV: "oceania",
  TW: "asia",
  TZ: "africa",
  UA: "europe",
  UG: "africa",
  UM: "oceania",
  US: "north-america",
  UY: "south-america",
  UZ: "asia",
  VA: "europe",
  VC: "north-america",
  VE: "south-america",
  VG: "north-america",
  VI: "north-america",
  VN: "asia",
  VU: "oceania",
  WF: "oceania",
  WS: "oceania",
  XK: "europe",
  YE: "asia",
  YT: "africa",
  ZA: "africa",
  ZM: "africa",
  ZW: "africa",
};

/**
 * Look up the continent for an ISO-3166-1 alpha-2 country code.
 *
 * Returns `null` if the code is unknown. Inputs are case-insensitive.
 *
 * @example
 *   iso2ToContinent("BB"); // "north-america"
 *   iso2ToContinent("jp"); // "asia"
 *   iso2ToContinent("XX"); // null
 */
export function iso2ToContinent(iso2: string): Continent | null {
  if (typeof iso2 !== "string" || iso2.length !== 2) return null;
  const key = iso2.toUpperCase();
  return ISO_TO_CONTINENT[key] ?? null;
}
