import type { Profile, Calendar } from "@/lib/profile-schema";

/**
 * Calendar-alignment score. The Torah-observant audience splits across
 * multiple reckoning systems (rabbinic, aviv-barley, Enoch, luni-solar,
 * observational new moon). Calendar choice strongly correlates with
 * feast-day timing — so this axis is a meaningful compatibility signal
 * even before feast-day overlap is computed.
 *
 *  - identical calendar → 1.0
 *  - both luni-solar-family (luni-solar / observational-new-moon / aviv-barley) → 0.7
 *  - one side "other" or undefined → 0.3 (unknown but not exclusionary)
 *  - else (cross-family, e.g. rabbinic vs aviv-barley) → 0.4
 */
export function scoreCalendar(a: Profile, b: Profile): number {
  const ca = a.calendar;
  const cb = b.calendar;

  if (!ca || !cb) return 0.3;
  if (ca === cb) return 1.0;
  if (ca === "other" || cb === "other") return 0.3;

  if (LUNI_SOLAR_FAMILY.has(ca) && LUNI_SOLAR_FAMILY.has(cb)) return 0.7;

  return 0.4;
}

const LUNI_SOLAR_FAMILY: ReadonlySet<Calendar> = new Set([
  "luni-solar",
  "observational-new-moon",
  "aviv-barley",
]);
