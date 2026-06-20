import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Ultra } from "next/font/google";
import Script from "next/script";

import { Analytics } from "@vercel/analytics/next";

import { META_PIXEL_ID } from "@/lib/meta-pixel";

import { UpdateBar } from "@/components/update-bar";
import { ThemeProvider } from "@/components/system/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/system/splash-screen";
import { safeJsonLd } from "@/lib/json-ld";

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
    "Verified profiles, 100+ languages, real connections. The matchmaking platform for Messianic Torah-observant believers seeking a spouse. Sign up and create your profile.",
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
      "Verified profiles, 100+ languages, real connections. For Messianic Torah-observant believers seeking a spouse. Sign up and create your profile.",
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
      className={`${plusJakartaSans.variable} ${ultra.variable} dark antialiased`}
      suppressHydrationWarning
    >
      {/* Reported 2026-06-10: some mobile browsers scrolled ~1200px past the
          marketing footer. The previous chain — html h-full + body min-h-full
          flex flex-col — combines lvh-anchored ancestors with dvh-anchored
          descendants (.ahavah-app uses min-h-dvh). On some Safari/Chromium
          variants the flex column math overshoots when those units diverge.
          Body now anchors directly to dvh; .ahavah-app keeps its own
          min-h-dvh so PWA shell pages still fill the viewport without
          relying on body being a flex container. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(siteJsonLd) }}
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
          <UpdateBar />
          {/* Toast portal — every page can `import { toast } from "sonner"`
              and surface user-visible error/success messages. Previously
              installed but never mounted, so silent-error patterns in token
              spend handlers (BoostCard, /matches reveal, /discover super-
              like) couldn't actually surface a user-visible message even
              when handlers called toast.error(). */}
          <Toaster position="top-center" richColors closeButton />
          {/* PWA launch splash — branded boot overlay, once per session. */}
          <SplashScreen />
        </ThemeProvider>
        {/* Vercel Web Analytics — privacy-friendly page-view + visitor metrics.
            Activated in the Vercel dashboard; this mounts the collector. */}
        <Analytics />
        {/* Meta Pixel — ad conversion measurement (dataset 1882730319359833,
            docs/meta-pixel-plan.md). Renders only when NEXT_PUBLIC_META_PIXEL_ID
            is set, so local dev and preview builds stay pixel-free. CSP allows
            connect.facebook.net (script) + www.facebook.com (event delivery)
            in next.config.ts. Standard events live in src/lib/meta-pixel.ts. */}
        {META_PIXEL_ID ? (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        ) : null}
      </body>
    </html>
  );
}
