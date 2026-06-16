#!/usr/bin/env node
/**
 * Sub-plan 25 — axis-9 contrast measurement sweep.
 *
 * One-off audit script. Parses brand tokens from globals.css + hard-coded
 * tier hex values, converts OKLCH -> sRGB -> relative luminance per WCAG 2.x,
 * computes contrast ratios for every text-on-bg pair actually used in the
 * product, and prints a PASS/FAIL table sorted by ratio ascending.
 *
 * No deps; pure ESM. Run with: `node scripts/audit-contrast.mjs`.
 *
 * Thresholds (WCAG 2.1):
 *   - Normal body text  >= 4.5 : 1
 *   - Large / UI / icons >= 3   : 1
 *
 * Math references:
 *   - OKLCH -> sRGB: https://bottosson.github.io/posts/oklab/
 *   - Relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

// --------------------------------------------------------------------------
// Color math (OKLCH -> linear sRGB -> sRGB -> relative luminance)
// --------------------------------------------------------------------------

/**
 * OKLCH (L, C, h-degrees) -> OKLab (L, a, b).
 */
function oklchToOklab(L, C, hDeg) {
  const hRad = (hDeg * Math.PI) / 180;
  return {
    L,
    a: C * Math.cos(hRad),
    b: C * Math.sin(hRad),
  };
}

/**
 * OKLab -> linear sRGB (Björn Ottosson's matrix).
 * Reference: https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab
 */
function oklabToLinearSrgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

/**
 * Linear sRGB component -> gamma-encoded sRGB component [0, 1].
 */
function linearToGamma(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.0031308
    ? 12.92 * c
    : 1.055 * c ** (1 / 2.4) - 0.055;
}

/**
 * sRGB component (gamma-encoded, [0, 1]) -> linear component.
 */
function gammaToLinear(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.04045
    ? c / 12.92
    : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * OKLCH -> sRGB [0..1] triple. Components are clipped to [0, 1] (out-of-gamut
 * colors get clamped — acceptable because all brand colors are in-gamut by
 * design). The returned triple is gamma-encoded sRGB (what you'd see on screen).
 */
function oklchToSrgb(L, C, hDeg) {
  const lab = oklchToOklab(L, C, hDeg);
  const lin = oklabToLinearSrgb(lab);
  return {
    r: linearToGamma(lin.r),
    g: linearToGamma(lin.g),
    b: linearToGamma(lin.b),
  };
}

/**
 * Hex string "#RRGGBB" -> sRGB [0..1] triple.
 */
function hexToSrgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

/**
 * Relative luminance per WCAG 2.x:
 *   L = 0.2126 R + 0.7152 G + 0.0722 B
 * where R/G/B are linearized sRGB components.
 */
function relativeLuminance(srgb) {
  const r = gammaToLinear(srgb.r);
  const g = gammaToLinear(srgb.g);
  const b = gammaToLinear(srgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio per WCAG 2.x: (L1 + 0.05) / (L2 + 0.05), L1 lighter.
 */
function contrastRatio(srgbA, srgbB) {
  const lA = relativeLuminance(srgbA);
  const lB = relativeLuminance(srgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Composite a foreground with alpha onto an opaque background -> opaque sRGB.
 * Used for white/85 (text-white with 85% alpha) over bg-indigo etc.
 *
 * Compositing is done in linear-light space for correctness, then re-gamma-
 * encoded. Alpha is a 0..1 multiplier on the foreground; bg keeps (1 - alpha).
 */
function compositeOver(fgSrgb, alpha, bgSrgb) {
  const fgR = gammaToLinear(fgSrgb.r);
  const fgG = gammaToLinear(fgSrgb.g);
  const fgB = gammaToLinear(fgSrgb.b);
  const bgR = gammaToLinear(bgSrgb.r);
  const bgG = gammaToLinear(bgSrgb.g);
  const bgB = gammaToLinear(bgSrgb.b);
  const r = alpha * fgR + (1 - alpha) * bgR;
  const g = alpha * fgG + (1 - alpha) * bgG;
  const b = alpha * fgB + (1 - alpha) * bgB;
  return {
    r: linearToGamma(r),
    g: linearToGamma(g),
    b: linearToGamma(b),
  };
}

// --------------------------------------------------------------------------
// Palette — keep in lock-step with src/app/globals.css and verify/page.tsx
// --------------------------------------------------------------------------

const colors = {
  white:        oklchToSrgb(1.00, 0.00, 0),
  black:        oklchToSrgb(0.10, 0.00, 0),
  canvas:       hexToSrgb("#000000"),
  indigo:       oklchToSrgb(0.18, 0.11, 280),   // bg-indigo (.ahavah-app)
  elevated:     oklchToSrgb(0.13, 0.06, 280),   // bg-elevated (popovers, Cards)
  lime:         oklchToSrgb(0.95, 0.18, 119),
  lavender:     oklchToSrgb(0.71, 0.16, 295),
  pink:         oklchToSrgb(0.65, 0.24, 17),
  textSecondary: oklchToSrgb(0.75, 0.04, 280),
  textMuted:    oklchToSrgb(0.72, 0.05, 280),   // bumped 0.66->0.72 (2026-06-16) for legibility; live in globals.css
  success:      oklchToSrgb(0.85, 0.21, 138),
  gold:         hexToSrgb("#FFD700"),
  silver:       hexToSrgb("#C0C0C0"),
  bronze:       hexToSrgb("#CD7F32"),
};

// --------------------------------------------------------------------------
// Test matrix — every (fg, bg) pair used somewhere in product code
// --------------------------------------------------------------------------

const PAIRS = [
  // Body text on the three canvases ------------------------------------------
  { label: "white         on canvas",         fg: colors.white,     bg: colors.canvas,   min: 4.5, used: "body on /map, /chat (outside .ahavah-app)" },
  { label: "white         on indigo",         fg: colors.white,     bg: colors.indigo,   min: 4.5, used: "body inside .ahavah-app" },
  { label: "white         on elevated",       fg: colors.white,     bg: colors.elevated, min: 4.5, used: "body inside Cards, popovers, sheets" },

  // Brand-color buttons / pills ---------------------------------------------
  { label: "white         on lime",           fg: colors.white,     bg: colors.lime,     min: 4.5, used: "(diagnostic) text-white on lime CTA — should fail badly" },
  { label: "white         on lavender",       fg: colors.white,     bg: colors.lavender, min: 4.5, used: "(diagnostic) text-white on lavender pill" },
  { label: "white         on pink/danger",    fg: colors.white,     bg: colors.pink,     min: 4.5, used: "(diagnostic) text-white on pink/danger surface" },
  { label: "black         on lime",           fg: colors.black,     bg: colors.lime,     min: 4.5, used: "lime CTA label (Button.tone='brand' primary-foreground)" },
  { label: "black         on lavender",       fg: colors.black,     bg: colors.lavender, min: 4.5, used: "lavender pill label (Button.tone='lavender')" },

  // Secondary copy -----------------------------------------------------------
  { label: "text-secondary on canvas",        fg: colors.textSecondary, bg: colors.canvas,   min: 4.5, used: "secondary copy on /map" },
  { label: "text-secondary on indigo",        fg: colors.textSecondary, bg: colors.indigo,   min: 4.5, used: "secondary copy on .ahavah-app body" },
  { label: "text-secondary on elevated",      fg: colors.textSecondary, bg: colors.elevated, min: 4.5, used: "secondary copy inside Cards / popovers" },

  // Captions (text-muted) ---------------------------------------------------
  { label: "text-muted    on canvas",         fg: colors.textMuted, bg: colors.canvas,   min: 4.5, used: "small captions on /map" },
  { label: "text-muted    on indigo",         fg: colors.textMuted, bg: colors.indigo,   min: 4.5, used: "small captions inside .ahavah-app" },
  { label: "text-muted    on elevated",       fg: colors.textMuted, bg: colors.elevated, min: 4.5, used: "small captions inside Cards" },

  // Alpha-mixed text-white over indigo / elevated ---------------------------
  { label: "white/85      on indigo",         fg: compositeOver(colors.white, 0.85, colors.indigo),   bg: colors.indigo,   min: 4.5, used: "tier-card body copy (verify page)" },
  { label: "white/85      on elevated",       fg: compositeOver(colors.white, 0.85, colors.elevated), bg: colors.elevated, min: 4.5, used: "tier-card body copy inside elevated Cards" },
  { label: "white/70      on indigo",         fg: compositeOver(colors.white, 0.70, colors.indigo),   bg: colors.indigo,   min: 3.0, used: "placeholder hint text (large/UI threshold)" },

  // Tier-color icon badges --------------------------------------------------
  // IconBadge tone="tier" puts text-black on tier color (small + xl + 2xl hero)
  { label: "black         on gold",           fg: colors.black,     bg: colors.gold,     min: 3.0, used: "Gold tier IconBadge (UI)" },
  { label: "black         on silver",         fg: colors.black,     bg: colors.silver,   min: 3.0, used: "Silver tier IconBadge (UI)" },
  { label: "black         on bronze",         fg: colors.black,     bg: colors.bronze,   min: 3.0, used: "Bronze tier IconBadge (UI)" },
  { label: "white         on gold",           fg: colors.white,     bg: colors.gold,     min: 3.0, used: "(alternative) white on gold" },
  { label: "white         on silver",         fg: colors.white,     bg: colors.silver,   min: 3.0, used: "(alternative) white on silver" },
  { label: "white         on bronze",         fg: colors.white,     bg: colors.bronze,   min: 3.0, used: "(alternative) white on bronze — hero icon if swapped" },

  // Lavender accent text ----------------------------------------------------
  { label: "lavender      on indigo",         fg: colors.lavender,  bg: colors.indigo,   min: 4.5, used: "lavender text/links on .ahavah-app canvas" },
  { label: "lavender      on elevated",       fg: colors.lavender,  bg: colors.elevated, min: 4.5, used: "lavender text/links inside Cards" },

  // Lime accent text --------------------------------------------------------
  { label: "lime          on indigo",         fg: colors.lime,      bg: colors.indigo,   min: 3.0, used: "lime accents (number-stepper active, brand dot)" },

  // Success / online dot ---------------------------------------------------
  { label: "success       on indigo",         fg: colors.success,   bg: colors.indigo,   min: 3.0, used: "online dot color, occasional success text" },

  // Pink text (banned page hero, etc.) -------------------------------------
  { label: "pink          on indigo",         fg: colors.pink,      bg: colors.indigo,   min: 4.5, used: "text-pink hero icon (banned page) — body threshold for completeness" },
  { label: "pink          on elevated",       fg: colors.pink,      bg: colors.elevated, min: 4.5, used: "text-pink inside Cards" },
];

// --------------------------------------------------------------------------
// Run + report
// --------------------------------------------------------------------------

const results = PAIRS.map((p) => {
  const ratio = contrastRatio(p.fg, p.bg);
  const pass = ratio >= p.min;
  return { ...p, ratio, pass };
});

results.sort((a, b) => a.ratio - b.ratio);

const labelW = Math.max(...results.map((r) => r.label.length));
const usedW  = Math.max(...results.map((r) => r.used.length));

const header = [
  "Pair".padEnd(labelW),
  "Ratio",
  "Min",
  "Result",
  "Used in",
].join(" | ");
const sep = "-".repeat(header.length);

console.log("Sub-plan 25 contrast audit");
console.log("Tokens parsed from src/app/globals.css + src/app/verify/page.tsx");
console.log("Sorted ascending by ratio. WCAG 2.1: 4.5 body / 3.0 large+UI.");
console.log("");
console.log(header);
console.log(sep);
for (const r of results) {
  const ratioStr = r.ratio.toFixed(2).padStart(5);
  const minStr   = r.min.toFixed(1).padStart(3);
  const verdict  = r.pass ? "PASS" : "FAIL";
  console.log([
    r.label.padEnd(labelW),
    ratioStr,
    minStr,
    verdict.padEnd(6),
    r.used.padEnd(usedW),
  ].join(" | "));
}

const failures = results.filter((r) => !r.pass);
console.log("");
console.log(`Total pairs:     ${results.length}`);
console.log(`Passing:         ${results.length - failures.length}`);
console.log(`Failing:         ${failures.length}`);
if (failures.length) {
  console.log("");
  console.log("FAILURES:");
  for (const f of failures) {
    console.log(`  - ${f.label}: ${f.ratio.toFixed(2)} < ${f.min.toFixed(1)} (${f.used})`);
  }
}
