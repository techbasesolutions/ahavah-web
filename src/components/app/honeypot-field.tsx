"use client";

/**
 * Hidden honeypot field. Real users never see / fill this; bots that
 * scrape the form and submit every input will. The backend silently
 * pretends success when this field carries a value, so bots get no
 * signal that they were rejected.
 *
 * Accessibility: tabIndex=-1 + aria-hidden + autoComplete=off + a visually-
 * hidden offscreen wrapper (NOT display:none, since some screen-reader
 * bots still read display:none fields). The label is generic so it
 * doesn't read as a "trick" if any assistive tech does surface it.
 *
 * Usage:
 *   const [website, setWebsite] = useState("");
 *   <HoneypotField value={website} onChange={setWebsite} />
 *   ... onSubmit: include `website` in the POST body
 */

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function HoneypotField({ value, onChange }: Props) {
  // Tailwind's `sr-only` class is the canonical "visually hidden but still
  // in the DOM" pattern (clip-path + 1px box). Bots that scrape the form
  // see the field; users + most screen readers don't. The `name="website"`
  // attribute is what bots target — they fill every named input.
  return (
    <div className="sr-only" aria-hidden>
      <label htmlFor="hp-website">Website</label>
      <input
        id="hp-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
