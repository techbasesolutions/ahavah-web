"use client";

// Public marketing-surface footer. Shared by /, /faq, /terms, /privacy,
// /community. 4-col grid desktop / Accordion mobile, dark canvas, copyright
// row at the bottom. Pixel-precise marketing rhythm matches the design
// handoff. Same eslint-disable rationale as src/app/page.tsx.
/* eslint-disable no-restricted-syntax */

import { useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FeedbackDialog } from "@/components/app/feedback-dialog";

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how",      label: "How it works" },
  { href: "/#verified", label: "Verification" },
  { href: "/#waitlist", label: "Join waitlist" },
];

const AUDIENCE_LINKS = [
  { href: "/messianic-matchmaking", label: "Messianic matchmaking" },
  { href: "/biblical-polygyny",     label: "Biblical marriage" },
  { href: "/faith-marriage-abroad", label: "Across borders" },
];

const COMPANY_LINKS = [
  { href: "/faq",                    label: "Help & FAQ" },
  { href: "/resources",              label: "Resources" },
  { href: "mailto:admin@ahavah.app", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/terms",     label: "Terms of service" },
  { href: "/privacy",   label: "Privacy policy" },
  { href: "/community", label: "Community guidelines" },
];

type ColLink = { href: string; label: string };
type ColAction = { label: string; onClick: () => void };

function FooterCol({ title, links, action }: { title: string; links: ColLink[]; action?: ColAction }) {
  return (
    <nav aria-label={`${title} links`} className="flex flex-col">
      <h4 className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-white/55">
        {title}
      </h4>
      <ul className="flex flex-col gap-2.5">
        {links.map(({ href, label }) =>
          href.startsWith("/") ? (
            <li key={href + label}>
              <Link href={href} className="text-sm text-white/80 hover:text-white transition-colors">
                {label}
              </Link>
            </li>
          ) : (
            <li key={href + label}>
              <a href={href} className="text-sm text-white/80 hover:text-white transition-colors">
                {label}
              </a>
            </li>
          ),
        )}
        {action ? (
          <li>
            <button
              type="button"
              onClick={action.onClick}
              className="text-left text-sm text-white/80 hover:text-white transition-colors"
            >
              {action.label}
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function FooterAccordionCol({ title, links, action }: { title: string; links: ColLink[]; action?: ColAction }) {
  return (
    <AccordionItem value={title.toLowerCase()} className="border-b border-white/10 border-t-0">
      <AccordionTrigger className="py-4 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-white/85 hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="pb-4 px-1">
        <ul className="flex flex-col gap-3">
          {links.map(({ href, label }) =>
            href.startsWith("/") ? (
              <li key={href + label}>
                <Link href={href} className="text-sm text-white/80">{label}</Link>
              </li>
            ) : (
              <li key={href + label}>
                <a href={href} className="text-sm text-white/80">{label}</a>
              </li>
            ),
          )}
          {action ? (
            <li>
              <button
                type="button"
                onClick={action.onClick}
                className="text-left text-sm text-white/80"
              >
                {action.label}
              </button>
            </li>
          ) : null}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}

export function MarketingFooter() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const feedbackAction: ColAction = {
    label: "Send feedback",
    onClick: () => setFeedbackOpen(true),
  };

  return (
    <footer className="bg-[#0F0B1F] text-white/80 px-4 sm:px-6 md:px-8 py-14 mt-auto">
      <div className="mx-auto max-w-[1200px]">
        {/* Desktop / md+ — 4-col grid */}
        <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8 mb-12">
          <div className="max-w-[360px]">
            <div className="mb-4">
              <Logo variant="horizontal" forceTheme="dark" height={32} />
            </div>
            <p className="text-sm leading-[1.55] text-white/60">
              Find a spouse across borders. Verified profiles, 100+ languages,
              real connections. Made for the diaspora.
            </p>
          </div>
          <FooterCol title="Product"      links={PRODUCT_LINKS} />
          <FooterCol title="Who it's for" links={AUDIENCE_LINKS} />
          <FooterCol title="Company"      links={COMPANY_LINKS} action={feedbackAction} />
          <FooterCol title="Legal"        links={LEGAL_LINKS} />
        </div>

        {/* Mobile — accordion */}
        <div className="md:hidden mb-8">
          <div className="mb-6">
            <Logo variant="horizontal" forceTheme="dark" height={32} />
            <p className="mt-4 text-[13px] leading-[1.55] text-white/60">
              Find a spouse across borders. Verified profiles, 100+ languages,
              real connections. Made for the diaspora.
            </p>
          </div>
          <Accordion multiple className="border-t border-white/10">
            <FooterAccordionCol title="Product" links={PRODUCT_LINKS} />
            <FooterAccordionCol title="Who it's for" links={AUDIENCE_LINKS} />
            <FooterAccordionCol title="Company" links={COMPANY_LINKS} action={feedbackAction} />
            <FooterAccordionCol title="Legal"   links={LEGAL_LINKS} />
          </Accordion>
        </div>

        <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center text-[13px] text-white/50">
          <span>© 2026 Ahavah. All rights reserved.</span>
          <span>Made for the diaspora.</span>
        </div>
      </div>
    </footer>
  );
}
