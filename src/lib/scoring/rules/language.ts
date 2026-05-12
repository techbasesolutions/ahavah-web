import type { Profile } from "@/lib/profile-schema";

/**
 * Shared-language compatibility score. Per sub-plan 13 (worldwide search),
 * spoken languages are a discovery filter AND a compatibility signal: two
 * users who don't share a common language can't actually have a conversation.
 *
 * Formula (viewer-asymmetric, intersection-over-viewer):
 *   score = |viewer.languages ∩ candidate.languages| / max(|viewer.languages|, 1)
 *
 *  - Empty viewer.languages → 0 (no signal — guards division-by-zero)
 *  - Perfect coverage of viewer's languages → 1.0
 *  - Partial overlap → fraction of viewer's languages the candidate speaks
 *  - No overlap → 0
 *
 * Asymmetric on purpose: candidate speaking 7 languages doesn't help the
 * viewer if none of the viewer's are in the candidate's set.
 */
export function scoreLanguage(viewer: Profile, candidate: Profile): number {
  const v = viewer.languages ?? [];
  if (v.length === 0) return 0;
  const c = new Set(candidate.languages ?? []);
  const intersection = v.filter((lang) => c.has(lang)).length;
  return intersection / v.length;
}
