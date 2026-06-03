// JSON-LD safe stringify.
//
// `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html:
// JSON.stringify(x) }} />` is safe ONLY while every string in `x` is dev-
// authored static content. The moment any field is sourced from a CMS,
// user input, or external data, an embedded `</script>` or `<!--` in that
// data will break out of the JSON-LD island and inject executable HTML.
//
// Use `safeJsonLd(x)` everywhere instead of bare `JSON.stringify` so the
// island stays closed regardless of where the data came from.
//
// Escapes: `<` and `>` (script tag breakout), `&` (HTML entity ambiguity),
// U+2028 + U+2029 (JS treats these as line terminators inside string
// literals, which `<script>` JSON parsers traditionally tripped on).

const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEP).join("\\u2028")
    .split(PARA_SEP).join("\\u2029");
}
