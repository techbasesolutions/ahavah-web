/**
 * Backend-facing photo I/O for the Phase W pipeline.
 *
 * All photo operations go through the existing /profile-info endpoint on
 * ahavah-api. There is NO /photos REST resource — see api-types.ts for
 * the full contract index.
 *
 *   GET    /profile-info                     →   list (photo map)
 *   PATCH  /profile-info {base64_file}       →   upload one (by position)
 *   PATCH  /profile-info {photo_assignments} →   reorder (position swaps)
 *   DELETE /profile-info {files:[positions]} →   delete by positions
 *
 * Backend identity is `position` (1..7), NOT a UUID. The CDN URL embeds
 * the server-issued image UUID — that UUID lives only in GET responses
 * (it is never round-tripped on writes). For React keys, consumers should
 * use a derived string like `${position}-${nsfw_score ?? "pending"}` to
 * stay stable across moderation transitions.
 *
 * Moderation is async via the `nsfwphotorunner` + `photocleaner` cron
 * jobs (see ahavah-api/service/cron/). PATCH returns immediately with
 * the photo in pending state; verdict materialises on a later GET.
 * The adapter synthesises `ModerationState` from `nsfw_score` per:
 *
 *   null         → "pending-review"  (cron hasn't run yet, OR backend
 *                                     hasn't surfaced the score field)
 *   < 0.40       → "approved"
 *   0.40..0.75   → "pending-review"  (manual review queue)
 *   >= 0.75      → "rejected"        (photocleaner will remove)
 *
 * NOTE: As of 2026-05-12, GET /profile-info's SQL (service/person/sql:
 * Q_GET_PROFILE_INFO) returns photos as a `{position: uuid}` map and does
 * NOT surface `nsfw_score`. Until backend exposes the field, every photo
 * resolves to "pending-review". The threshold logic is in place so that
 * adding the field is a zero-client-side-change upgrade.
 */

import { apiClient, ApiError, getSessionToken } from "@/lib/api-client";
import { profileEndpoint } from "@/lib/onboarded-storage";
import type {
  ModerationState,
  PhotoRecord,
  ProfileInfoResponse,
  QuotaInfo,
  UploadResult,
} from "@/lib/api-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Backend hard cap (duotypes/__init__.py MAX_PHOTO_POSITION = 7). */
export const MAX_PHOTOS = 7;

/** Score thresholds for `ModerationState` synthesis. */
export const NSFW_APPROVED_BELOW = 0.4;
export const NSFW_REJECTED_AT = 0.75;

/** Base URL for image serving. Filenames follow `${size}-${uuid}.jpg`,
 *  where size ∈ { "original", 900, 450 }. We render the 450 variant in
 *  most UI surfaces (matches ahavah-frontend convention).
 *
 *  Default routes to the backend's `/image/<filename>` proxy, which
 *  streams from the private S3-compatible bucket. This avoids needing
 *  the bucket to be public-read and avoids depending on a CDN domain
 *  that wasn't set up. NEXT_PUBLIC_IMAGES_URL still wins when set, so
 *  we can swap to a real CDN later without code changes. */
const IMAGES_BASE_URL =
  process.env.NEXT_PUBLIC_IMAGES_URL ??
  `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/image`;

// ---------------------------------------------------------------------------
// Pure helpers (tested directly)
// ---------------------------------------------------------------------------

/** Maps a raw nsfw_score to a ModerationState per the documented table.
 *
 *  IMPORTANT: backend GET /profile-info does NOT surface nsfw_score; it
 *  returns only the position->uuid map. Defaulting null → "pending-review"
 *  was wrong — it left every photo permanently in the Reviewing state even
 *  though the backend's PATCH classifier ran synchronously and only saved
 *  the photo if it passed. If a photo exists in GET /profile-info, it
 *  passed moderation, period. We default null → "approved" accordingly.
 *  When backend exposes the score field, the threshold logic still applies. */
export function moderationStateFromScore(
  score: number | null | undefined,
): ModerationState {
  if (score === null || score === undefined) return "approved";
  if (score < NSFW_APPROVED_BELOW) return "approved";
  if (score < NSFW_REJECTED_AT) return "pending-review";
  return "rejected";
}

/** Builds the CDN URL for a photo at the 450px variant. */
export function cdnUrlFor(uuid: string, size: 450 | 900 | "original" = 450): string {
  return `${IMAGES_BASE_URL}/${size}-${uuid}.jpg`;
}

/** Strips the `data:...;base64,` prefix so the payload is pure base64.
 *  The backend's `Base64File.convert_base64` validator handles both
 *  prefixed and bare base64, but stripping client-side keeps the wire
 *  payload smaller and the request lean. */
export function stripDataUrlPrefix(maybeDataUrl: string): string {
  const i = maybeDataUrl.indexOf(",");
  return i === -1 ? maybeDataUrl : maybeDataUrl.slice(i + 1);
}

/** Reads a Blob as a base64 data URL using FileReader. Browser only. */
export function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file as base64."));
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------------------
// Adapter: GET /profile-info payload → PhotoRecord[]
// ---------------------------------------------------------------------------

/** Pure adapter — exported for tests. Takes the slice of GET /profile-info
 *  that the photo pipeline cares about and produces a position-sorted
 *  list of PhotoRecord. */
export function adaptProfileInfoPhotos(
  payload: ProfileInfoResponse,
  scoreMap: Readonly<Record<string, number | null>> = {},
): PhotoRecord[] {
  const photoMap = payload.photo ?? {};
  return Object.entries(photoMap)
    .map(([positionStr, uuid]) => {
      const position = Number(positionStr);
      const score = scoreMap[positionStr] ?? null;
      const record: PhotoRecord = {
        uuid: typeof uuid === "string" && uuid.length > 0 ? uuid : null,
        cdn_url: typeof uuid === "string" && uuid.length > 0 ? cdnUrlFor(uuid) : "",
        position,
        moderation_state: moderationStateFromScore(score),
        nsfw_score: score,
        created_at: "",
      };
      return record;
    })
    .sort((a, b) => a.position - b.position);
}

// ---------------------------------------------------------------------------
// Public surface — all backend-facing
// ---------------------------------------------------------------------------

/** Fetches the current user's profile and returns the photo list.
 *  Maps to GET /profile-info → adapter. */
export async function listPhotos(): Promise<PhotoRecord[]> {
  // GET only exists for /profile-info. Onboardees have no profile to read
  // yet — return empty so the UI renders the "add photos" affordance.
  const profile = await apiClient.get<ProfileInfoResponse>("/profile-info");
  return adaptProfileInfoPhotos(profile);
}

/** Pure client-side quota derivation. Backend does NOT surface
 *  usedBytes/limitBytes — we expose 0 sentinels so consumers know they
 *  cannot render byte counters. Callers pass the count from their already-
 *  loaded profile to avoid a redundant GET. */
export function getQuota(currentPhotoCount: number): QuotaInfo {
  return {
    usedBytes: 0,
    limitBytes: 0,
    maxPhotos: MAX_PHOTOS,
    currentPhotoCount,
  };
}

/** Uploads ONE photo at the given position. Sends PATCH /profile-info
 *  with a `base64_file` payload; the backend's Pydantic validator
 *  decodes + classifies + stores in R2 (synchronously in the request),
 *  and the moderation cron runs against the stored row asynchronously.
 *
 *  Returns an optimistic `UploadResult` with moderation_state =
 *  "pending-review" since the backend response is body-less. The caller
 *  is expected to refetch via listPhotos() to learn the resolved state
 *  once cron has run. */
export async function uploadPhoto(
  blob: Blob,
  options: { position: number; top?: number; left?: number },
): Promise<UploadResult> {
  const dataUrl = await blobToBase64DataUrl(blob);
  const base64 = stripDataUrlPrefix(dataUrl);
  await apiClient.patch<unknown>(profileEndpoint(), {
    base64_file: {
      position: options.position,
      base64,
      top: options.top ?? 0,
      left: options.left ?? 0,
    },
  });
  // Synthesize an optimistic record. The real UUID + cdn_url will appear
  // on the next listPhotos() refresh once the backend transaction commits.
  return {
    photo: {
      uuid: null,
      cdn_url: "",
      position: options.position,
      moderation_state: "pending-review",
      nsfw_score: null,
      created_at: "",
    },
  };
}

/** Deletes the photo(s) at the given position(s).
 *  Maps to DELETE /profile-info with `{ files: [position] }`. The
 *  `apiClient.delete` helper in this codebase doesn't accept a body, so
 *  we issue the request via a low-level fetch wrapping the same
 *  credentials + base-URL convention. */
export async function deletePhoto(position: number): Promise<void> {
  await sendDeleteWithBody(profileEndpoint(), { files: [position] });
}

/** Reorders photos by position-pair swaps. The map's keys are the
 *  source positions and the values are the destination positions; the
 *  backend validates that no position is targeted twice and that no
 *  entry maps to itself (see duotypes PhotoAssignments). */
export async function reorderPhotos(
  assignments: Record<number, number>,
): Promise<void> {
  await apiClient.patch<unknown>(profileEndpoint(), {
    photo_assignments: assignments,
  });
}

// ---------------------------------------------------------------------------
// Internal: DELETE with body
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

async function sendDeleteWithBody(path: string, body: unknown): Promise<void> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  // Backend uses bearer-token auth (set on /check-otp), NOT cookies.
  // The earlier raw fetch here omitted the Authorization header so every
  // DELETE 401'd silently — meaning the X / trash button on a photo did
  // nothing on production.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getSessionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let parsedBody: unknown = null;
    try {
      parsedBody = await res.json();
    } catch {
      try {
        parsedBody = await res.text();
      } catch {
        parsedBody = null;
      }
    }
    const message =
      parsedBody && typeof parsedBody === "object" && "message" in parsedBody
        ? String((parsedBody as { message: unknown }).message)
        : `HTTP ${res.status} on ${url}`;
    throw new ApiError(res.status, parsedBody, message);
  }
}
