import type { Profile, FeastDay } from "@/lib/profile-schema";

/**
 * Feast-day observance compatibility. The heart of "do we keep the appointed
 * times together?" — Jaccard intersection/union with a strong core-feast bonus.
 *
 * The Torah prescribes 7 "appointed times" (moedim): Passover, Unleavened Bread,
 * First Fruits, Shavuot, Trumpets, Yom Kippur, and Sukkot. Hanukkah and Purim
 * are observed but not commanded as feasts — they don't trigger the core bonus.
 *
 *  - Both undefined/empty → 0.5 (neutral: no commitment yet)
 *  - One undefined/empty → 0.4 (acceptable but asymmetric)
 *  - Compute the Jaccard intersection / union
 *  - Core-feast bonus: each shared core feast adds 0.05 (capped at 0.35 max)
 *  - Final = min(1.0, Jaccard + coreBonus)
 *
 * If both observe all 7 core feasts, Jaccard=1.0 and final=1.0.
 */
export function scoreFeast(a: Profile, b: Profile): number {
  const aSet = new Set(a.feastDays ?? []);
  const bSet = new Set(b.feastDays ?? []);

  if (aSet.size === 0 && bSet.size === 0) return 0.5;
  if (aSet.size === 0 || bSet.size === 0) return 0.4;

  const intersection = [...aSet].filter((f) => bSet.has(f));
  const unionSize = new Set([...aSet, ...bSet]).size;
  const jaccard = intersection.length / unionSize;

  let coreBonus = 0;
  for (const f of intersection) {
    if (CORE_FEASTS.has(f as FeastDay)) {
      coreBonus += 0.05;
    }
  }
  coreBonus = Math.min(0.35, coreBonus);

  return Math.min(1.0, jaccard + coreBonus);
}

const CORE_FEASTS: ReadonlySet<FeastDay> = new Set([
  "passover",
  "unleavened-bread",
  "first-fruits",
  "shavuot",
  "trumpets",
  "yom-kippur",
  "sukkot",
]);
