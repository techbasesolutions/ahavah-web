import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Ultra } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/system/theme-provider";

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
  title: "Ahavah",
  description:
    "Find love across borders. Verified profiles, real connections, 100+ languages.",
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
};

// Mobile-first PWA viewport. No zoom; Add-to-Home-Screen feel.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  colorScheme: "dark",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
