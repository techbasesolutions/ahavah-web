"use client";

// Per-page FAQ section for landing pages. Renders the accordion AND emits
// FAQPage structured data built from the same array (AEO/answer engines).
/* eslint-disable no-restricted-syntax */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function LandingFaq({
  heading,
  faqs,
}: {
  heading: string;
  faqs: ReadonlyArray<{ q: string; a: string }>;
}) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section className="flex flex-col gap-5 max-w-[760px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h2 className="m-0 text-2xl lg:text-3xl font-bold text-(--ink) tracking-tight">{heading}</h2>
      <Accordion className="flex flex-col gap-3">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`lf-${i}`}
            className="rounded-2xl border border-(--hairline) bg-(--card) px-5"
          >
            <AccordionTrigger className="py-4 text-base font-semibold text-(--ink) hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-meta leading-relaxed text-(--ink-2)">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
