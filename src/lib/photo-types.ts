/**
 * Canonical photo types for the Phase W backend photo pipeline.
 *
 * This module is the SINGLE SOURCE OF TRUTH for PhotoRecord +
 * ModerationState + QuotaInfo + ProfileInfoResponse. `api-types.ts`
 * re-exports these so the rest of the codebase can keep importing
 * from either location.
 *
 * Why the inverted ownership: `profile-schema.ts` imports PhotoRecord
 * (Profile.photos: PhotoRecord[] as of Task 3.8), and `api-types.ts`
 * imports Profile. If PhotoRecord lived in api-types.ts the import
 * graph would cycle.
 *
 * Lines preserved for grep continuity with the Phase W F.3 commit:
 *   src/lib/api-types.ts:50-99  (wire-contract block, now re-exports)
 */

// Wire-shape types --------------------------------------------------------

/** Server-side moderation verdict. `uploading` is a synthetic in-flight
 *  state the client emits while bytes are travelling — never returned
 *  by the backend (it always returns one of the three terminal states). */
export type ModerationState =
  | "approved"
  | "pending-review"
  | "rejected"
  | "uploading";

/** A photo as returned by GET /profile-info.
 *
 *  - `uuid`: server-issued image UUID. null when upstream Duolicious
 *    response omits it (e.g. an entry that was just deleted, or a
 *    transient response shape change). Used as the filename stem in
 *    CDN URLs: `${IMAGES_URL}/450-${uuid}.jpg`.
 *  - `cdn_url`: pre-built CDN URL at the 450px variant. Empty string
 *    when uuid is null.
 *  - `position`: 1..7 backend slot (duotypes MAX_PHOTO_POSITION).
 *  - `moderation_state`: synthesised client-side from nsfw_score.
 *  - `nsfw_score`: server-side classifier output; null while pending OR
 *    while backend does not surface it in GET response.
 *  - `created_at`: ISO-8601 server timestamp. Empty string when backend
 *    does not surface per-photo timestamps.
 */
export type PhotoRecord = {
  uuid: string | null;
  cdn_url: string;
  position: number;
  moderation_state: ModerationState;
  nsfw_score: number | null;
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

/** Quota descriptor. usedBytes / limitBytes are 0 sentinels since the
 *  backend does not surface byte counts; consumers must NOT render
 *  "X MB / Y MB" copy. */
export type QuotaInfo = {
  usedBytes: number;
  limitBytes: number;
  maxPhotos: number;
  currentPhotoCount: number;
};

/** Multipart upload progress. Bytes, not percent — the consumer computes
 *  percent if it needs one (avoids a divide-by-zero before the first
 *  chunk reports `totalBytes`).
 *
 *  Note: with the JSON-body PATCH transport (Phase W revised brief)
 *  upload progress is NOT actually reported — fetch() doesn't expose it.
 *  The shape is preserved so the UploadState union stays stable across
 *  consumers. */
export type UploadProgress = {
  loadedBytes: number;
  totalBytes: number;
};

/** Result envelope for uploadPhoto. Wraps the new PhotoRecord so sibling
 *  fields (rate-limit headroom, etc.) can be added without a breaking
 *  change. */
export type UploadResult = {
  photo: PhotoRecord;
};

// Client-only state machine -------------------------------------------------

/** Phases the `use-photo-upload` hook traverses. Distinct from
 *  `ModerationState` because the hook tracks the full lifecycle including
 *  client-side compression, while `ModerationState` is purely the
 *  server's verdict. */
export type UploadPhase =
  | "idle"
  | "compressing"
  | "uploading"
  | "moderating"
  | "ready"
  | "rejected"
  | "error";

/** Discriminated union surfaced by `use-photo-upload`. Each variant
 *  carries exactly the data the UI needs in that phase — no nullable
 *  fields, no "is this set yet?" checks at the call site. */
export type UploadState =
  | { kind: "idle" }
  | { kind: "compressing" }
  | { kind: "uploading"; progress: UploadProgress; previewUrl: string }
  | { kind: "moderating"; previewUrl: string }
  | { kind: "ready"; photo: PhotoRecord }
  | { kind: "rejected"; reason: string; previewUrl?: string }
  | { kind: "error"; message: string };
