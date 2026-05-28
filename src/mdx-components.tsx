// src/mdx-components.tsx — required by @next/mdx. Styles compiled MDX with
// the marketing design tokens. Internal links use next/link.
/* eslint-disable no-restricted-syntax */
import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => (
      <h2 className="mt-10 mb-3 text-2xl lg:text-3xl font-bold tracking-tight text-(--ink)" {...props} />
    ),
    h3: (props) => (
      <h3 className="mt-8 mb-2 text-lg lg:text-xl font-bold tracking-tight text-(--ink)" {...props} />
    ),
    p: (props) => <p className="my-4 text-base leading-[1.7] text-(--ink-2)" {...props} />,
    ul: (props) => <ul className="my-4 flex flex-col gap-2 pl-5 list-disc text-(--ink-2)" {...props} />,
    ol: (props) => <ol className="my-4 flex flex-col gap-2 pl-5 list-decimal text-(--ink-2)" {...props} />,
    li: (props) => <li className="text-base leading-[1.6]" {...props} />,
    blockquote: (props) => (
      <blockquote className="my-6 rounded-2xl border border-(--hairline) bg-(--card) p-5 text-(--ink-2) italic" {...props} />
    ),
    strong: (props) => <strong className="font-bold text-(--ink)" {...props} />,
    a: ({ href = "", ...rest }) =>
      href.startsWith("/") ? (
        <Link href={href} className="font-semibold text-(--color-lavender) hover:underline" {...rest} />
      ) : (
        <a href={href} className="font-semibold text-(--color-lavender) hover:underline" {...rest} />
      ),
    ...components,
  };
}
