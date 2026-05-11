/**
 * The 4-point sparkle that IS the Ahavah brand mark.
 *
 * Per docs/brand-signoff.md: this is the one bespoke SVG we own — kit
 * components don't ship a sparkle primitive matching the Dateasy idiom.
 * Documented exception to the no-hand-rolled-atoms rule.
 */

type Props = {
  size?: number;
  color?: string;
  className?: string;
};

export function SparkleMark({ size = 100, color = "#D7FF81", className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ahavah sparkle"
      role="img"
    >
      <path
        d="M50 5 C50 30 70 50 95 50 C70 50 50 70 50 95 C50 70 30 50 5 50 C30 50 50 30 50 5 Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Sparkle wrapped in the rounded-square tile lockup (per kit image 9 brand
 * mark cell). Used in BrandMark icon-only mode + as the app icon source.
 */
export function SparkleTile({
  size = 56,
  tileColor = "#1A1340",
  sparkleColor = "#D7FF81",
  className,
}: {
  size?: number;
  tileColor?: string;
  sparkleColor?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: tileColor,
        borderRadius: Math.round(size * 0.22),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SparkleMark size={Math.round(size * 0.62)} color={sparkleColor} />
    </div>
  );
}

/**
 * Full lockup: sparkle tile + lowercase "ahavah" wordmark to its right.
 */
export function BrandMark({
  size = "md",
}: {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const config = {
    sm: { tile: 24, word: 18, gap: 6 },
    md: { tile: 36, word: 28, gap: 10 },
    lg: { tile: 56, word: 44, gap: 14 },
    xl: { tile: 96, word: 72, gap: 22 },
  }[size];

  return (
    <div className="flex items-center" style={{ gap: config.gap }}>
      <SparkleTile size={config.tile} />
      <span
        style={{
          fontSize: config.word,
          lineHeight: `${config.word * 1.05}px`,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#FFFFFF",
        }}
      >
        ahavah
      </span>
    </div>
  );
}
