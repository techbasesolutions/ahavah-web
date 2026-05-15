"use client";

import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  PageHeader,
  PageHeaderTitle,
  PageShell,
} from "@/components/app/page-shell";

/**
 * /safety/emergency — country-keyed list of police / ambulance / fire
 * numbers. Replaces the previous "Local emergency numbers (coming
 * soon)" non-link in /settings/safety.
 *
 * The list is intentionally short — just the regions Ahavah is most
 * present in (North America, EU/UK, Israel, Caribbean) plus the
 * universal cellular fallback (112 / 911 reach an operator on most GSM
 * networks regardless of the country code).
 *
 * Numbers below are the national general-purpose emergency lines as
 * documented by each country's official channel (US FCC, UK gov.uk,
 * EU 112 portal, Israeli MoH). Operators connect to police / ambulance
 * / fire as the caller specifies.
 *
 * Tel links use the international `tel:+CountryNumber` form so PWAs
 * launched from a phone open the dialer with the right country code
 * pre-filled. On desktop, browsers show a "call with FaceTime / Skype /
 * default" picker — better than a dead link.
 */

type EmergencyEntry = {
  region: string;
  number: string;
  tel: string;
  note?: string;
};

const ENTRIES: ReadonlyArray<EmergencyEntry> = [
  {
    region: "Universal (GSM cellular)",
    number: "112",
    tel: "tel:112",
    note: "Reaches an operator on most cellular networks worldwide, even without a SIM.",
  },
  {
    region: "United States · Canada",
    number: "911",
    tel: "tel:911",
  },
  {
    region: "United Kingdom",
    number: "999 or 112",
    tel: "tel:999",
  },
  {
    region: "European Union",
    number: "112",
    tel: "tel:112",
    note: "Single number for police, ambulance, fire across all EU member states.",
  },
  {
    region: "Israel",
    number: "100 (police) · 101 (medical) · 102 (fire)",
    tel: "tel:100",
  },
  {
    region: "Australia",
    number: "000",
    tel: "tel:000",
  },
  {
    region: "Caribbean (most islands)",
    number: "911",
    tel: "tel:911",
    note: "Confirm with your local provider — some smaller islands use 999 or 112.",
  },
];

export default function EmergencyNumbersPage() {
  return (
    <PageShell bottomPad="default">
      <PageHeader pad="tight" className="flex items-center gap-3">
        <Button
          nativeButton={false}
          size="circle"
          tone="elevated"
          aria-label="Back to safety center"
          render={<Link href="/settings/safety" prefetch={false} />}
        >
          <ArrowLeft className="text-white" />
        </Button>
        <PageHeaderTitle>Emergency numbers</PageHeaderTitle>
      </PageHeader>

      <article className="flex flex-col gap-4 px-5 pt-4">
        <p className="text-body leading-relaxed text-text-secondary">
          If you are in immediate danger, call your local emergency
          line. Tap a number below to open your phone&apos;s dialer.
          When in doubt, dial <span className="text-white">112</span>{" "}
          on any cellular phone — it routes to the local operator on
          most networks worldwide.
        </p>

        <ul className="flex flex-col gap-2">
          {ENTRIES.map((e) => (
            <li key={e.region}>
              <a
                href={e.tel}
                className="flex items-start gap-3 rounded-2xl bg-bg-elevated p-4 transition-colors hover:bg-bg-elevated/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-canvas text-lavender"
                >
                  <Phone className="size-5" />
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-meta text-text-secondary">
                    {e.region}
                  </span>
                  <span className="text-body font-medium text-white">
                    {e.number}
                  </span>
                  {e.note ? (
                    <span className="text-caption leading-relaxed text-text-muted">
                      {e.note}
                    </span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-2 text-caption leading-relaxed text-text-muted">
          This list covers the regions Ahavah is most active in. If your
          country isn&apos;t listed, search &ldquo;emergency number{" "}
          [your country]&rdquo; or dial 112 from a cellular phone.
        </p>
      </article>
    </PageShell>
  );
}
