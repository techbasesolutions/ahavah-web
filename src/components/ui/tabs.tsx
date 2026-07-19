"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none data-[variant=brand]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        // Ahavah brand — SEGMENTED PILL per the design-system kit spec
        // (Claude Design screens.jsx MatchesScreen: "pill-shaped TabsList
        // with rounded transparent track; active trigger lights with
        // lime fill"). The previous full-bleed underline treatment was a
        // kit-build-time mistranscription — see
        // docs/design-audit-2026-07-19.md #1.
        brand: "h-tap-lg w-full gap-1 rounded-[14px] border border-(--hairline) bg-transparent p-1 text-(--ink-2)",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        // Brand-variant overrides — segmented pill (kit spec): trigger
        // fills the track, radius 10, meta type; active = lime fill,
        // black ink, bold. A lime count Pill inside the ACTIVE trigger
        // inverts to black-on-lime (design-system exports) via the
        // Badge's data-slot, so pages keep passing <Pill variant="lime">.
        "group-data-[variant=brand]/tabs-list:rounded-[10px] group-data-[variant=brand]/tabs-list:border-transparent group-data-[variant=brand]/tabs-list:bg-transparent group-data-[variant=brand]/tabs-list:text-meta group-data-[variant=brand]/tabs-list:text-(--ink-2) group-data-[variant=brand]/tabs-list:data-active:bg-lime group-data-[variant=brand]/tabs-list:data-active:text-black group-data-[variant=brand]/tabs-list:data-active:font-bold group-data-[variant=brand]/tabs-list:data-active:shadow-none dark:group-data-[variant=brand]/tabs-list:data-active:bg-lime dark:group-data-[variant=brand]/tabs-list:data-active:border-transparent dark:group-data-[variant=brand]/tabs-list:data-active:text-black",
        "group-data-[variant=brand]/tabs-list:data-active:**:data-[slot=badge]:bg-black group-data-[variant=brand]/tabs-list:data-active:**:data-[slot=badge]:text-lime",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100 group-data-[variant=brand]/tabs-list:after:hidden",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
