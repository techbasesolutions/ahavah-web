import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Ahavah design-system enforcement layer.
 *
 * The rules below catch the per-instance overrides that bypass the
 * cva variant system + token scale. If a screen needs a size we don't
 * have, EXTEND THE VARIANT — don't override at the call site.
 */
const designSystemRules = {
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-syntax": [
      "error",
      // Ban arbitrary-pixel font-size / size / height / width / spacing
      // utilities anywhere in JSX className strings.  Drives every
      // sizing decision through the @theme token scale.
      {
        selector: `JSXAttribute[name.name='className'][value.type='Literal'][value.value=/(?:^|\\s)(?:text|size|h|w|min-h|max-h|min-w|max-w|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|top|right|bottom|left|inset|leading|tracking)-\\[[^\\]]+\\]/]`,
        message:
          "Arbitrary Tailwind value detected. Use a token from globals.css @theme (e.g. `text-body`, `h-tap`, `size-tap-lg`) or extend the cva variant. Per-instance overrides break the spacing/typography scale.",
      },
      // Ban inline `style={{ width|height|padding|margin|gap|fontSize }}`.
      // Sizing belongs to variants; only color/transform/animation values
      // may stay inline (and only when no token covers them).
      {
        selector: `JSXAttribute[name.name='style'] Property[key.name=/^(width|height|padding|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginTop|marginRight|marginBottom|marginLeft|gap|fontSize|lineHeight|letterSpacing)$/]`,
        message:
          "Inline sizing/spacing styles bypass the design system. Use a Tailwind token utility or a cva variant.",
      },
      // Ban Tailwind utilities that reference @theme inline tokens with
      // [data-theme=light] overrides. These compile to inlined dark
      // values at build time and NEVER honor the light theme switch.
      // Use the var() form instead: bg-(--card), bg-(--app),
      // text-(--ink-2), text-(--ink-3), text-(--ink).
      {
        selector: `JSXAttribute[name.name='className'][value.type='Literal'][value.value=/(?:^|\\s)(?:bg-bg-elevated|bg-bg-indigo|bg-bg-canvas|text-text-secondary|text-text-muted)(?:\\s|$|\\/)/]`,
        message:
          "This Tailwind utility maps to an @theme inline token that doesn't honor the light-mode override. Use the var() form instead — bg-(--card), bg-(--app), text-(--ink-2), text-(--ink-3) — or migrate the call site to a kit primitive (Card tone=\"default\", PageShell, BackButton).",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  designSystemRules,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated UI library (shadcn primitives + Kibo blocks): the
    // primitives ARE the design-system source-of-truth — they're
    // expected to encode the canonical sizing internally.
    "src/components/ui/**",
    "src/components/kibo-ui/**",
    // Bespoke brand primitives (sparkle/tile/wordmark lockup): documented
    // exception per docs/brand-signoff.md — kit doesn't ship sticker SVGs,
    // so these are the only hand-rolled atoms. They take a `size` prop and
    // encode their internal sizing inline; that's their public API.
    "src/components/brand/**",
    // Static showcase reproductions of Dateasy case-study slides.
    // These intentionally use literal pixel coordinates to mirror the
    // reference deck; they're shown only at /design-system, not in the
    // shipped app, and shouldn't be refactored to use product-app tokens.
    "src/components/reproductions/**",
  ]),
]);

export default eslintConfig;
