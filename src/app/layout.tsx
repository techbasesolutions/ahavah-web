import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Ultra } from "next/font/google";

import { Analytics } from "@vercel/analytics/next";

import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/system/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

// Display face for the marketing landing — heavy slab serif paired with
// PJS body. Only used on / (landing page hero + section heads) via
// var(--font-display). Single weight (400) is all Ultra ships.
const ultra = Ultra({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ahavah.app"),
  title: {
    default: "Ahavah · Find a spouse across borders",
    template: "%s · Ahavah",
  },
  description:
    "Verified profiles, 100+ languages, real connections. The matchmaking platform for Messianic Torah-observant believers seeking a spouse. Join the waitlist.",
  alternates: { canonical: "/" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ahavah",
  },
  icons: {
    icon: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icon-192.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Ahavah",
    title: "Ahavah · Find a spouse across borders",
    description:
      "Verified profiles, 100+ languages, real connections. For Messianic Torah-observant believers seeking a spouse. Join the waitlist.",
    url: "https://ahavah.app",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Ahavah — Torah-observant matchmaking" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahavah · Find a spouse across borders",
    description:
      "Verified profiles, 100+ languages, real connections. For Messianic Torah-observant believers seeking a spouse.",
    images: ["/og.png"],
  },
};

// Mobile-first PWA viewport. Pinch-zoom left enabled for accessibility
// (WCAG 1.4.4) — do not re-add maximumScale/userScalable.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  colorScheme: "dark",
};

// Site-level structured data: declares the Ahavah brand entity (Organization)
// and the site (WebSite) for search + AI engines (GEO/entity recognition).
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ahavah.app/#organization",
      name: "Ahavah",
      url: "https://ahavah.app",
      logo: "https://ahavah.app/email/logo-horizontal.png",
      description:
        "Torah-observant matchmaking for Messianic believers seeking a spouse, across borders and 100+ languages.",
    },
    {
      "@type": "WebSite",
      "@id": "https://ahavah.app/#website",
      name: "Ahavah",
      url: "https://ahavah.app",
      publisher: { "@id": "https://ahavah.app/#organization" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${ultra.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <ThemeProvider>
          {/* Skip link — hidden by default, surfaces on keyboard focus.
              WCAG 2.4.1 (Bypass Blocks). Lets keyboard users jump past
              decorative + repeated chrome straight to the route content. */}
          <a
            href="#ahavah-main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:text-meta focus:font-bold focus:text-black"
          >
            Skip to main content
          </a>
          {/*
           * App sits in a 414px-max-width column centered on pure-black canvas.
           * Matches Dateasy editorial-mockup style AND iPhone widths (390-430).
           * Installed PWA on phone renders edge-to-edge since width ≤ 414.
           */}
          {/* tabIndex={-1} makes <main> programmatically focusable so the
              skip-link's `#ahavah-main` fragment activation moves keyboard
              focus here (browsers don't focus non-interactive elements
              on fragment navigation by default). */}
          <main id="ahavah-main" tabIndex={-1} className="ahavah-app focus-visible:outline-none">
            {children}
          </main>
          <ServiceWorkerRegister />
          {/* Toast portal — every page can `import { toast } from "sonner"`
              and surface user-visible error/success messages. Previously
              installed but never mounted, so silent-error patterns in token
              spend handlers (BoostCard, /matches reveal, /discover super-
              like) couldn't actually surface a user-visible message even
              when handlers called toast.error(). */}
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
        {/* Vercel Web Analytics — privacy-friendly page-view + visitor metrics.
            Activated in the Vercel dashboard; this mounts the collector. */}
        <Analytics />
      </body>
    </html>
  );
}
