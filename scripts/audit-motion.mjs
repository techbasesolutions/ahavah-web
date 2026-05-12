#!/usr/bin/env node
/**
 * Sub-plan 26 — axis-5 motion-budget audit.
 *
 * One-off audit script. Globs every page.tsx + ui/app component, regexes out
 * every framer-motion `transition={{ ... }}` literal, extracts (delay, duration)
 * tuples, computes per-file `max(delay + duration)` and tags PASS (<=500ms) /
 * FAIL (>500ms).
 *
 * No deps; pure ESM. Run with: `node scripts/audit-motion.mjs`.
 *
 * Budget rationale (see docs/motion-budget.md):
 *   - Interaction feedback (button taps, hovers) <= 300ms.
 *   - Staggered entrance reveals (cascaded item fade-ups) <= 500ms total.
 *
 * The audit measures (b): the max wall-clock from page mount until the last
 * entrance item has finished animating in. Tap/hover micro-interactions are
 * out of scope (they're variant-level CSS in cva, not inline literals).
 *
 * Static analysis only. We deliberately approximate dynamic patterns
 * (`i * 0.05`, `Math.min(i, 4) * 0.04`) by sampling i across a small range
 * and taking the worst case. Approximate but reliable — what we want is
 * "which files exceed the budget" not millisecond-accurate render timing.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");
const SRC = join(ROOT, "src");
const BUDGET_MS = 500;

// --------------------------------------------------------------------------
// File walk (no deps; manual recursion)
// --------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip node_modules / .next / hidden dirs.
      if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
      walk(full, out);
    } else if (st.isFile() && /\.tsx$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Numeric expression evaluator
//
// We see literals like:
//   0.4
//   0.2 + 0.05
//   0.1 + i * 0.04
//   Math.min(i, 4) * 0.04
//   0.2 + Math.min(i, 5) * 0.05
//
// Strategy: sample `i` across [0, 1, 2, ..., 12] and take the max. Replace
// `Math.min(a, b)` with the literal min where a and b are numbers / i, then
// eval the resulting arithmetic in a Function sandbox limited to numeric ops.
// --------------------------------------------------------------------------

function evalExpr(expr, iValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 24]) {
  const cleaned = expr.trim();
  if (!cleaned) return null;
  let max = -Infinity;
  for (const i of iValues) {
    try {
      // Replace Math.min / Math.max with bare values where possible.
      // Use Function constructor with `i` bound — safe because we only invoke
      // on literals from our own codebase, and we strip everything but
      // numbers / arithmetic operators / Math.min / Math.max / i / parens.
      const sanitized = cleaned.replace(/[^0-9+\-*/.,()\s\w]/g, "");
      // Allow only specific identifiers: i, Math.min, Math.max
      if (!/^[\s\d+\-*/().,]*(i|Math\.(min|max)|[\s\d+\-*/().,])*[\s\d+\-*/().,iMath.minax]*$/.test(sanitized)) {
        // Couldn't sanitize cleanly — skip.
        return null;
      }
      // eslint-disable-next-line no-new-func
      const fn = new Function("i", "Math", `return (${sanitized});`);
      const v = fn(i, Math);
      if (typeof v === "number" && Number.isFinite(v) && v > max) max = v;
    } catch {
      // Skip un-evalable expressions.
    }
  }
  return max === -Infinity ? null : max;
}

// --------------------------------------------------------------------------
// Parse transition literals from a file
// --------------------------------------------------------------------------

/**
 * Extract `transition={{ ... }}` blocks. The JSX expression syntax means we
 * need to balance braces. We find every `transition={{` then walk forward
 * counting braces until back to zero. Returns array of inner-object strings.
 */
function extractTransitions(source) {
  const out = [];
  const re = /transition=\{\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const start = m.index + m[0].length; // points just after the {{
    // We're now inside one level of braces (the outer JSX expression brace
    // was consumed and we are inside the object literal brace). Walk forward
    // counting braces — start depth at 1 (for the object literal brace).
    let depth = 1;
    let i = start;
    while (i < source.length && depth > 0) {
      const c = source[i];
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      i += 1;
    }
    if (depth === 0) {
      // i is just after the closing `}` of the object literal. The next char
      // should be the closing `}` of the JSX expression — skip it.
      const inner = source.slice(start, i - 1); // strip the closing }
      // Find the line number of `start` in source.
      const lineNo = source.slice(0, m.index).split("\n").length;
      out.push({ inner, line: lineNo });
    }
  }
  return out;
}

/**
 * Pull `duration: <expr>` and `delay: <expr>` from a transition object body.
 * Returns { duration, delay } as numbers (max over sampled i) or null if
 * the key is absent / un-evaluable.
 */
function parseTransitionFields(inner) {
  // The inner can contain nested objects (e.g. ease: [0.4, 0, 0.2, 1] — that's
  // an array, not an object, but still). We use a tolerant regex that grabs
  // up to the next comma or closing brace at depth 0.
  function grab(key) {
    const re = new RegExp(`(?:^|[\\s,])${key}\\s*:`);
    const m = re.exec(inner);
    if (!m) return null;
    const start = m.index + m[0].length;
    // Walk forward, tracking depth of (), [], {}. Stop at comma or end at depth 0.
    let depth = 0;
    let i = start;
    while (i < inner.length) {
      const c = inner[i];
      if (c === "(" || c === "[" || c === "{") depth += 1;
      else if (c === ")" || c === "]" || c === "}") depth -= 1;
      else if (c === "," && depth === 0) break;
      i += 1;
    }
    return inner.slice(start, i).trim();
  }
  const durStr = grab("duration");
  const delStr = grab("delay");
  const duration = durStr ? evalExpr(durStr) : null;
  const delay = delStr ? evalExpr(delStr) : null;
  return { duration, delay, durStr, delStr };
}

// --------------------------------------------------------------------------
// Per-file analysis
// --------------------------------------------------------------------------

function analyzeFile(path) {
  const source = readFileSync(path, "utf8");
  const blocks = extractTransitions(source);
  const items = [];
  for (const b of blocks) {
    // Skip looping animations (`repeat: Infinity`, `repeat: <number>`). Those
    // are continuous decorative loops (rotate-shimmer, pulse), not entrance
    // reveals, and they intentionally exceed the staggered-entrance budget.
    if (/\brepeat\s*:/.test(b.inner)) continue;
    const f = parseTransitionFields(b.inner);
    const duration = f.duration ?? 0;
    const delay = f.delay ?? 0;
    const total = duration + delay;
    items.push({
      line: b.line,
      duration,
      delay,
      durStr: f.durStr,
      delStr: f.delStr,
      total,
    });
  }
  const totalMs = items.length
    ? Math.max(...items.map((it) => it.total)) * 1000
    : 0;
  return {
    path,
    rel: relative(ROOT, path).split(sep).join("/"),
    itemCount: items.length,
    items,
    totalMs,
    pass: totalMs <= BUDGET_MS,
  };
}

// --------------------------------------------------------------------------
// Run + report
// --------------------------------------------------------------------------

const allFiles = walk(SRC);
const results = allFiles.map(analyzeFile).filter((r) => r.itemCount > 0);
results.sort((a, b) => a.totalMs - b.totalMs);

const labelW = Math.max(...results.map((r) => r.rel.length), 4);
const header = [
  "File".padEnd(labelW),
  "Items",
  "Total (ms)",
  "Result",
].join(" | ");
const sep1 = "-".repeat(header.length);

const lines = [];
lines.push("# Sub-plan 26 motion-budget audit");
lines.push("");
lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
lines.push("");
lines.push("Static analysis of every `transition={{ ... }}` literal under");
lines.push("`src/`. For each file, totals = max(delay + duration) over all");
lines.push("inline motion entrances, sampled across i ∈ [0..24] to capture");
lines.push("the worst-case index in `Math.min(i, N)` cascades.");
lines.push("");
lines.push(`Budget: staggered entrance reveals must total <= ${BUDGET_MS} ms.`);
lines.push("Interaction-feedback motion (button taps, hovers) is variant-level");
lines.push("CSS and not measured here.");
lines.push("");
lines.push("```");
lines.push(header);
lines.push(sep1);
for (const r of results) {
  const ms = r.totalMs.toFixed(0).padStart(10);
  const items = String(r.itemCount).padStart(5);
  const verdict = r.pass ? "PASS" : "FAIL";
  lines.push([
    r.rel.padEnd(labelW),
    items,
    ms,
    verdict.padEnd(6),
  ].join(" | "));
}
lines.push("```");
lines.push("");

const failures = results.filter((r) => !r.pass);
lines.push(`Total files measured: ${results.length}`);
lines.push(`Passing: ${results.length - failures.length}`);
lines.push(`Failing: ${failures.length}`);
lines.push("");
if (failures.length) {
  lines.push("## Failures (>500ms total)");
  lines.push("");
  for (const f of failures) {
    lines.push(`### \`${f.rel}\` (${f.totalMs.toFixed(0)}ms)`);
    lines.push("");
    lines.push("| Line | duration | delay | total |");
    lines.push("|---:|---:|---:|---:|");
    for (const it of f.items) {
      const tot = (it.total * 1000).toFixed(0);
      const dur = it.duration.toFixed(2);
      const del = it.delay.toFixed(2);
      lines.push(`| ${it.line} | ${dur} (\`${it.durStr ?? "—"}\`) | ${del} (\`${it.delStr ?? "—"}\`) | ${tot} |`);
    }
    lines.push("");
  }
}

// Print to console too.
console.log("Sub-plan 26 motion-budget audit");
console.log(`Files measured: ${results.length}; budget: ${BUDGET_MS}ms.`);
console.log("");
console.log(header);
console.log(sep1);
for (const r of results) {
  const ms = r.totalMs.toFixed(0).padStart(10);
  const items = String(r.itemCount).padStart(5);
  const verdict = r.pass ? "PASS" : "FAIL";
  console.log([
    r.rel.padEnd(labelW),
    items,
    ms,
    verdict.padEnd(6),
  ].join(" | "));
}
console.log("");
console.log(`Passing: ${results.length - failures.length}`);
console.log(`Failing: ${failures.length}`);
if (failures.length) {
  console.log("");
  console.log("FAILURES:");
  for (const f of failures) {
    console.log(`  - ${f.rel}: ${f.totalMs.toFixed(0)}ms`);
  }
}

// Write the latest snapshot to a stable path. The dated, curated doc
// (`docs/motion-audit-2026-05-12.md`) preserves the pre-fix + post-fix
// history from sub-plan 26 and is NOT overwritten by re-runs — re-runs land
// in `docs/motion-audit-latest.md` which always reflects the current
// codebase state.
const outPath = join(ROOT, "docs", "motion-audit-latest.md");
writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log("");
console.log(`Report written to ${relative(ROOT, outPath).split(sep).join("/")}`);
