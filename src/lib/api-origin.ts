// Where the Flask API lives, in ONE place.
//
// Two callers need this and they must never disagree:
//   1. next.config.ts's `/api/:path*` rewrite destination, the same-origin
//      proxy the browser uses for every ordinary API call.
//   2. src/app/s/[key]/route.ts, which calls the API directly with
//      `redirect: "manual"` so it can read the click's receipt off the raw
//      response before the visitor is redirected.
//
// The second used to repeat the first's expression character for character
// while its own comment called next.config the single source of truth. The
// failure mode if they ever drifted is silent, not loud: the direct call
// would go to the wrong origin, fail, and fall back to the proxy, which
// still redirects the visitor correctly but mints no receipt. Clicks would
// keep rising while attributed sign-ups went to zero, which is exactly the
// shape of untrustworthy number this Spotlight wave exists to remove. One
// exported function, imported by both, makes that drift impossible.
//
// Read at call time, not at module load, so a test or a build step that sets
// the variable after import still gets the value it set.
export function apiOrigin(): string {
  return (
    process.env.AHAVAH_API_ORIGIN ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:5000" : "https://api.ahavah.app")
  );
}
