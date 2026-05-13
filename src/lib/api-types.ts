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
// ---------------------------------------------------------------------------

export type ModerationState =
  | "approved"
  | "pending-review"
  | "rejected"
  | "uploading";

export type PhotoRecord = {
  /** Server-issued image UUID. null when upstream Duolicious response
   *  omits it (e.g. transient response shape changes). Used as the
   *  filename stem in CDN URLs: `${IMAGES_URL}/450-${uuid}.jpg`. */
  uuid: string | null;
  cdn_url: string;
  position: number;
  moderation_state: ModerationState;
  /** Server-side NSFW classifier output; null while pending (cron has
   *  not yet run) OR while backend does not surface it in GET response. */
  nsfw_score: number | null;
  /** ISO-8601 server timestamp. May be empty string when backend does
   *  not surface per-photo timestamps in GET /profile-info. */
  created_at: string;
};

/** Raw photo shape inside GET /profile-info. The backend serialises the
 *  `photo` table as `{ "1": "uuid1", "2": "uuid2", ... }` sparse maps;
 *  also returns parallel `photo_blurhash` + `photo_verification` maps
 *  keyed by the same positions. */
export type ProfileInfoPhotoMap = Record<string, string>;

/** Subset of GET /profile-info the photo pipeline cares about. The full
 *  response includes ~40 other profile fields not relevant here; consumers
 *  that want the broader shape should import `Profile` directly. */
export type ProfileInfoResponse = {
  photo: ProfileInfoPhotoMap | null;
  photo_blurhash?: Record<string, string> | null;
  photo_verification?: Record<string, boolean> | null;
};

export type QuotaInfo = {
  /** Not surfaced server-side. 0 sentinel — consumers should not
   *  display "X MB / Y MB" copy. */
  usedBytes: number;
  /** Not surfaced server-side. 0 sentinel. */
  limitBytes: number;
  /** Hard backend cap: duotypes/__init__.py:129 ge=1 le=7 via
   *  MAX_PHOTO_POSITION. */
  maxPhotos: number;
  currentPhotoCount: number;
};

export type UploadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

export type UploadResult = {
  photo: PhotoRecord;
};

// ---------------------------------------------------------------------------
// Discovery — service/search/__init__.py + service/discovery/__init__.py
// ---------------------------------------------------------------------------

export type DiscoverCandidate = Profile & { id: string };

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
  with_profile: Partial<Profile> & { id: string };
  created_at: string;
};

export type MatchesResponse = {
  matches: ReadonlyArray<MatchRecord>;
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
