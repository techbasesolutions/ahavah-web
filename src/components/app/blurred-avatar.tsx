import { cva, type VariantProps } from "class-variance-authority"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const blurredAvatarVariants = cva(
  "inline-flex items-center justify-center rounded-full bg-[color:var(--color-lavender)]/40 backdrop-blur-sm text-[color:var(--ink)] ring-1 ring-[color:var(--hairline)]",
  {
    variants: {
      size: {
        sm: "h-10 w-10",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-20 w-20",
      },
    },
    defaultVariants: { size: "md" },
  }
)

type Props = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof blurredAvatarVariants>

export function BlurredAvatar({ size, className, ...rest }: Props) {
  return (
    <span className={cn(blurredAvatarVariants({ size }), className)} {...rest}>
      <Lock aria-hidden className="h-4 w-4" />
    </span>
  )
}
