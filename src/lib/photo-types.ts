/**
 * Shared photo types for the Phase W backend photo pipeline.
 *
 * Re-exports the canonical type definitions from `api-types.ts` (the
 * single source of truth for the backend contract) so consumers can
 * import them from a domain-shaped module without depending on the
 * full api-types surface.
 *
 * Why re-export instead of duplicate: the api-client / api-types pair
 * owns the wire contract. If we duplicated `PhotoRecord` here it would
 * silently drift the moment the backend adds a field. Anything photo-
 * specific that does NOT belong on the wire (e.g. local-only upload
 * machine states) is defined fresh below.
 *
 * Lines preserved for grep continuity with the Phase W F.3 commit:
 *   src/lib/api-types.ts:52-83  (canonical defs)
 */

import type {
  ModerationState as ApiModerationState,
  PhotoRecord as ApiPhotoRecord,
  QuotaInfo as ApiQuotaInfo,
  UploadProgress as ApiUploadProgress,
  UploadResult as ApiUploadResult,
} from "@/lib/api-types";

// Wire-shape re-exports ----------------------------------------------------

/** Server-side moderation state. `uploading` is a synthetic in-flight state
 *  the client emits while bytes are travelling — never returned by the
 *  backend (it always returns one of the three terminal states). */
export type ModerationState = ApiModerationState;

/** A photo as returned by the backend. UUID is server-issued. `cdn_url`
 *  points at DigitalOcean Spaces (bucket `ahavah-photos-prod`, region
 *  nyc3) and is safe to render directly. */
export type PhotoRecord = ApiPhotoRecord;

/** Quota descriptor returned by GET /photos/quota. */
export type QuotaInfo = ApiQuotaInfo;

/** Multipart upload progress. Bytes, not percent — the consumer computes
 *  percent if it needs one (avoids a divide-by-zero before the first
 *  chunk reports `totalBytes`). */
export type UploadProgress = ApiUploadProgress;

/** Result envelope for POST /photos. Wraps the new PhotoRecord so the
 *  backend can later add sibling fields (rate-limit headroom, etc.)
 *  without a breaking change. */
export type UploadResult = ApiUploadResult;

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
