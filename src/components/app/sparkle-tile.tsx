import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tileVariants = cva(
  "inline-flex items-center justify-center rounded-2xl bg-(--color-persian-indigo)",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-14 w-14",
      },
    },
    defaultVariants: { size: "md" },
  }
)

type Props = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof tileVariants>

export function SparkleTile({ size, className, ...rest }: Props) {
  return (
    <span className={cn(tileVariants({ size }), className)} {...rest}>
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className="h-1/2 w-1/2 fill-(--color-lime)"
      >
        <path d="M50 5 C50 30 70 50 95 50 C70 50 50 70 50 95 C50 70 30 50 5 50 C30 50 50 30 50 5 Z" />
      </svg>
    </span>
  )
}
