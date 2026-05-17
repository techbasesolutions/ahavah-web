/**
 * TypeScript types matching the ahavah-api backend endpoints (Phase W).
 *
 * Hand-written, NOT codegen — keeps types narrow and the surface small.
 * Each section is keyed to a backend file under `d:/Antigravity/ahavah-api/`
 * so future maintainers can find the source-of-truth.
 *
 * Update rule: when an endpoint signature changes in the backend, update
 * here in the SAME PR. Type drift is the single most common source of
 * runtime bugs in fetch-based clients.
 */

import type { Profile } from "@/lib/profile-schema";

// ---------------------------------------------------------------------------
// Auth — service/api/__init__.py lines 173-229
// ---------------------------------------------------------------------------

export type RequestOtpRequest = {
  email: string;
};

export type CheckOtpRequest = {
  email: string;
  otp: string;
};

export type CheckOtpResponse = {
  /** Backend also sets duo_session as an httpOnly cookie; this field is
   *  documented for parity but the client never reads it directly. */
  session_token: string;
  is_new_account: boolean;
};

export type CheckSessionResponse = {
  valid: boolean;
};

// ---------------------------------------------------------------------------
// Profile — service/api/__init__.py lines 297-427
// ---------------------------------------------------------------------------

export type MeResponse = Partial<Profile>;

export type ProfileInfoPatch = Partial<Profile>;

// ---------------------------------------------------------------------------
// Photos — the backend has NO /photos REST resource. Photo I/O is folded
// into the existing /profile-info endpoint:
//   GET    /profile-info                     → photo map {position: uuid}
//   PATCH  /profile-info {base64_file:{...}} → upload one photo by position
//                                              (duotypes/__init__.py:128, 401)
//   PATCH  /profile-info {photo_assignments} → reorder by position swaps
//                                              (duotypes/__init__.py:188)
//   DELETE /profile-info {files:[positions]} → delete photos at positions
//                                              (duotypes/__init__.py:361)
// Moderation is async via cron (nsfwphotorunner + photocleaner). PATCH
// returns immediately; verdict materialises on a later GET /profile-info.
// nsfw_score is currently NOT surfaced in GET /profile-info — the adapter
// in photo-storage.ts synthesises ModerationState per the documented
// threshold table and tolerates a null score (treated as pending-review).
//
// Canonical definitions live in photo-types.ts (so profile-schema.ts can
// import PhotoRecord without cycling through this file). We re-export
// them here so the original `from "@/lib/api-types"` imports keep working.
// ---------------------------------------------------------------------------

export type {
  ModerationState,
  PhotoRecord,
  ProfileInfoPhotoMap,
  ProfileInfoResponse,
  QuotaInfo,
  UploadProgress,
  UploadResult,
} from "@/lib/photo-types";

// ---------------------------------------------------------------------------
// Discovery — service/search/__init__.py + service/discovery/__init__.py
// ---------------------------------------------------------------------------

export type DiscoverCandidate = Profile & {
  id: string;
  /**
   * Seconds since the prospect's last keepalive ping. Drives the
   * green-dot / "Last seen Xm ago" indicator (see lib/last-seen.ts).
   * Undefined when the prospect has never been signed in.
   */
  seconds_since_last_online?: number;
};

/** Peer-profile fields surfaced inside MatchRecord.with_profile and
 *  LikeRecord.with_profile. Backend ships snake_case; Profile inherits
 *  camelCase fields, so we merge with `seconds_since_last_online` as
 *  the only addition. */
type PeerProfile = Partial<Profile> & {
  id: string;
  seconds_since_last_online?: number;
};

export type SearchRequest = {
  cursor?: string;
  age_min?: number;
  age_max?: number;
  countries?: string;       // comma-joined ISO codes
  languages?: string;       // comma-joined language codes
};

export type SearchResponse = {
  results: ReadonlyArray<DiscoverCandidate>;
  next_cursor: string | null;
};

export type DecisionRequest = {
  profile_uuid: string;
  decision: "like" | "nope";
};

export type DecisionResponse = {
  match: { match_id: string; with_profile_id: string } | null;
};

export type MatchRecord = {
  match_id: string;
  with_profile: PeerProfile;
  created_at: string;
};

export type MatchesResponse = {
  matches: ReadonlyArray<MatchRecord>;
};

/** Incoming-like (someone liked YOU but you haven't decided). Same
 *  with_profile shape as MatchRecord for frontend reuse — the only
 *  difference is `liked_at` instead of `created_at` (= when THEY
 *  liked you, not when a mutual match formed). */
export type LikeRecord = {
  with_profile: PeerProfile;
  liked_at: string;
};

export type IncomingLikesResponse = {
  /** Total count regardless of premium tier — used for the upgrade
   *  CTA copy ("3 people like you"). Always populated. */
  count: number;
  /** Full like records. EMPTY for free users — server redacts to
   *  prevent DevTools paywall bypass. Populated only when premium. */
  likes: ReadonlyArray<LikeRecord>;
  /** Mirrors the server's premium gate so the frontend doesn't need
   *  to re-derive from /profile-info. Premium users always get
   *  `likes.length === count`. */
  premium: boolean;
};

// ---------------------------------------------------------------------------
// Chat — REST companion endpoints (real-time goes via WebSocket; see
// chat-types.ts in Agent 4's module).
// ---------------------------------------------------------------------------

export type InboxThread = {
  id: string;
  with_user_id: string;
  last_message: {
    body: string;
    server_time: string;
    from_user_id: string;
  } | null;
  unread_count: number;
};

export type InboxResponse = {
  threads: ReadonlyArray<InboxThread>;
};

// ---------------------------------------------------------------------------
// Verification — service/identity_verification/__init__.py
// ---------------------------------------------------------------------------

export type VerificationTier = "bronze" | "silver" | "gold";

export type StartIdFlowRequest = {
  tier: VerificationTier;
};

export type StartIdFlowResponse = {
  stripe_session_url: string;
  /** Stripe Identity session ID — also stored server-side on the user record. */
  session_id: string;
};

// ---------------------------------------------------------------------------
// Subscriptions — Phase W Cutover adds /checkout/web
// ---------------------------------------------------------------------------

export type CheckoutWebRequest = {
  /** Subscription SKU; backend maps to Stripe Price ID. */
  sku: string;
  /** Where to send the user after success. */
  success_url: string;
  /** Where to send the user after cancel. */
  cancel_url: string;
};

export type CheckoutWebResponse = {
  stripe_checkout_url: string;
};

// ---------------------------------------------------------------------------
// Tokens — Phase 3 (monetization-tokens v1, 2026-05-16). Balance endpoint
// is a thin server read over the SUM(delta) of the per-user `token_ledger`
// rows. The frontend never sees individual ledger entries; only the
// derived scalar balance.
// ---------------------------------------------------------------------------

export type TokenBalanceResponse = { balance: number };
