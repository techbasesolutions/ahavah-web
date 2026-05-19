#!/usr/bin/env node
/**
 * Pre-build hook: stamp public/sw.js with a deploy-unique CACHE name.
 *
 * Why: every deploy ships new content-hashed JS chunks, but the SW's
 * CACHE constant (`ahavah-vN`) was static. The activate handler only
 * evicts caches whose name doesn't match CACHE — so a stale deploy's
 * cached assets stuck around indefinitely until someone hand-bumped
 * the constant. Users complained about stale UI after every push.
 *
 * Strategy: at build time, replace `ahavah-v<digits>` with `ahavah-<sha>`,
 * where <sha> is the current git commit's short hash (Vercel injects
 * VERCEL_GIT_COMMIT_SHA in the build env). Falls back to a wall-clock
 * stamp for local builds where neither env var nor `git` is available.
 *
 * Idempotent: re-running on the same commit produces the same name, so
 * incremental builds during a single deploy don't keep busting the cache.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SW_PATH = resolve(__dirname, "..", "public", "sw.js");

function pickStamp() {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { encoding: "utf-8" }).trim();
  } catch {
    // Fall back to ms-since-epoch base36 — still unique per build,
    // just not git-traceable. Local non-git builds will see this.
    return `dev-${Date.now().toString(36)}`;
  }
}

function main() {
  const stamp = pickStamp();
  const newName = `ahavah-${stamp}`;
  const content = readFileSync(SW_PATH, "utf-8");

  // Fail only if the regex doesn't match at all (sw.js missing a CACHE
  // line). An idempotent re-stamp (same hash already in file) is fine —
  // re-running on the same commit must not break the build.
  const CACHE_RE = /const CACHE = "[^"]+";/;
  if (!CACHE_RE.test(content)) {
    console.error("[bump-sw-cache] no CACHE line found in", SW_PATH);
    process.exit(1);
  }

  const next = content.replace(CACHE_RE, `const CACHE = "${newName}";`);
  if (next === content) {
    console.log(`[bump-sw-cache] ${SW_PATH} already at ${newName} (no-op)`);
    return;
  }
  writeFileSync(SW_PATH, next);
  console.log(`[bump-sw-cache] stamped ${SW_PATH} → ${newName}`);
}

main();
