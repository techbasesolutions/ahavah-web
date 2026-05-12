/**
 * Seeded portrait gradients for sample / placeholder profile photos.
 *
 * Until Sub-plan 9 (Photos schema + upload pipeline) lands, the
 * /profile/[uuid] viewer renders a 3-gradient carousel stamped from a
 * deterministic hash of the uuid. Same uuid → same gradients every time,
 * so /profile/esther stays stable across reloads.
 *
 * Palette is brand-anchored: every gradient resolves into `#1A1340` or
 * `#3A1F4F` (bg-indigo family) so the photo region reads as Ahavah, not
 * stock pink. Six sets distributed across 8 SAMPLE_PROFILES → guaranteed
 * variety; manual seeded swap if two adjacent profiles collide visually.
 */

export const PHOTO_GRADIENT_SETS: ReadonlyArray<ReadonlyArray<string>> = [
  // 0 — lavender dusk
  [
    "linear-gradient(135deg,#9F76EA 0%,#3A1F4F 100%)",
    "linear-gradient(160deg,#C9A8F0 0%,#1A1340 100%)",
    "linear-gradient(150deg,#7E5CC9 0%,#1A1340 100%)",
  ],
  // 1 — peach warmth
  [
    "linear-gradient(135deg,#FFB088 0%,#3A1F4F 100%)",
    "linear-gradient(160deg,#F0A0E4 0%,#3A1F4F 100%)",
    "linear-gradient(150deg,#FFD9A8 0%,#1A1340 100%)",
  ],
  // 2 — dawn gold
  [
    "linear-gradient(135deg,#F9D976 0%,#3A1F4F 100%)",
    "linear-gradient(160deg,#FBC850 0%,#1A1340 100%)",
    "linear-gradient(150deg,#FFE9A8 0%,#3A1F4F 100%)",
  ],
  // 3 — rose night
  [
    "linear-gradient(135deg,#FFC0CB 0%,#3A1F4F 100%)",
    "linear-gradient(160deg,#F4A6C0 0%,#1A1340 100%)",
    "linear-gradient(150deg,#E889B5 0%,#3A1F4F 100%)",
  ],
  // 4 — lime spring
  [
    "linear-gradient(135deg,#C8FF88 0%,#3A1F4F 100%)",
    "linear-gradient(160deg,#A8E89A 0%,#1A1340 100%)",
    "linear-gradient(150deg,#D4FF88 0%,#3A1F4F 100%)",
  ],
  // 5 — blue dusk
  [
    "linear-gradient(135deg,#6CB7FF 0%,#3A1F4F 100%)",
    "linear-gradient(160deg,#88C0FF 0%,#1A1340 100%)",
    "linear-gradient(150deg,#A8D8FF 0%,#3A1F4F 100%)",
  ],
];

/**
 * Deterministic uuid → gradient set. djb2-ish 32-bit hash so collisions
 * are stable across reloads.
 */
export function gradientsFor(uuid: string): ReadonlyArray<string> {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (Math.imul(h, 31) + uuid.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % PHOTO_GRADIENT_SETS.length;
  return PHOTO_GRADIENT_SETS[idx];
}
