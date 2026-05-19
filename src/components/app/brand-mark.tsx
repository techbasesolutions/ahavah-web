/**
 * BrandMark — reusable 4-point sparkle SVG component.
 *
 * Uses the canonical path from docs/handoff-desktop/design-system-v2.md §Sparkle.
 * This is the brand-owned bespoke SVG — do not redraw.
 */

type BrandMarkProps = {
  size?: number;
  color?: string;
  className?: string;
};

export function BrandMark({
  size = 32,
  color = "currentColor",
  className,
}: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ahavah sparkle"
      role="img"
    >
      <path d="M50 5 C50 30 70 50 95 50 C70 50 50 70 50 95 C50 70 30 50 5 50 C30 50 50 30 50 5 Z" />
    </svg>
  );
}
