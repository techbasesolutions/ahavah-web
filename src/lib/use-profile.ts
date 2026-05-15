"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import type { Profile } from "@/lib/profile-schema";
import {
  loadProfileFromCache,
  saveProfileToCache,
  clearProfileCache,
} from "@/lib/use-profile-storage";
import { apiClient, ApiError, setSessionToken } from "@/lib/api-client";
import { clearChatSession, writeChatSession } from "@/lib/chat-session";
import { cdnUrlFor } from "@/lib/photo-storage";
import type { PhotoRecord } from "@/lib/photo-types";
import {
  readOnboarded,
  writeOnboarded,
  clearOnboarded,
} from "@/lib/onboarded-storage";

// Re-export so existing call sites that import { writeOnboarded } from
// "@/lib/use-profile" keep working without churn.
export { writeOnboarded } from "@/lib/onboarded-storage";

// Phase W gap: the frontend Profile schema is the Torah-observant product
// shape (firstName, assembly, tzitzit, ...) but the backend's
// PatchOnboardeeInfo (duotypes/__init__.py:281) / PatchProfileInfo
// (duotypes/__init__.py:401) are the upstream Duolicious shape (name,
// gender, relationship_status, ...). We translate at this boundary:
//   - outbound (client -> server): rename + value-transform mapped keys,
//     fan one input field into multiple PATCHes when needed (e.g. `sex`
//     also sets `other_peoples_genders`), drop unmappable Torah-observant
//     fields (assembly, polygyny, ...) so the rest of onboarding can
//     proceed
//   - inbound (server -> client): rename so profile.firstName reads the
//     server's `name`
// Backend enforces "exactly one field per PATCH" (model_validator at
// duotypes/__init__.py:309 and 444), so update() fans the translated
// entries into one PATCH per key.
type FieldTransform = (value: unknown) => Record<string, unknown> | null;

const MARITAL_STATUS_MAP: Record<string, string> = {
  "never-married": "Single",
  "married": "Married",
  "re-married": "Married",
  "divorced": "Divorced",
  "widowed": "Widowed",
};

const INTENT_TO_LOOKING_FOR_MARRIAGE = new Set([
  "first-wife",
  "additional-wife",
  "marriage-only",
]);

const TRANSFORMS: Record<string, FieldTransform> = {
  // Identity --------------------------------------------------------------
  firstName: (v) => (typeof v === "string" ? { name: v } : null),

  // Date of birth — backend's MIN_AGE is enforced server-side via the
  // computed age. Frontend already filtered <18.
  dob: (v) => (typeof v === "string" ? { date_of_birth: v } : null),

  // `age` alone can't reconstruct date_of_birth. We persist `dob`
  // separately (see /onboarding/dob/page.tsx) and ignore `age` here.
  age: () => null,

  // Sex maps to gender + auto-fills other_peoples_genders. Ahavah is
  // hetero-only per memory/feedback_ahavah_gender_binary.md; we infer
  // the opposite from the user's selection. The other PATCH must go
  // out separately because of the "one field per PATCH" rule.
  sex: (v) => {
    if (v === "female") {
      return { gender: "Woman", other_peoples_genders: ["Man"] };
    }
    if (v === "male") {
      return { gender: "Man", other_peoples_genders: ["Woman"] };
    }
    return null;
  },

  // ISO country code (e.g. "BB", "TT"). Dual-write: direct `country`
  // PATCH updates person.country (CHAR(2)) so /search pool follows
  // (Q_UNCACHED_SEARCH_2 filters on p.country = ANY(preferred)). Also
  // bundleExtra so the precise client-side value is preserved in
  // ahavah_extra and round-trips into the spread. Backend's
  // PatchProfileInfo accepts both `country` and `ahavah_extra` per
  // duotypes/__init__.py:503; the "exactly one field" validator
  // means each gets fanned out into a separate PATCH by the caller.
  country: (v) => {
    if (typeof v !== "string" || v.length !== 2) return null;
    return {
      country: v.toUpperCase(),
      ahavah_extra: { country: v.toUpperCase() },
    };
  },

  // Resolved location string — must be an exact long_friendly match. The
  // country page populates this asynchronously after the user picks a
  // country; falsy means "not yet resolved", skip the PATCH.
  location: (v) =>
    typeof v === "string" && v.length > 0 ? { location: v } : null,

  // Relationship status --------------------------------------------------
  // Two-step write: coarse upstream `relationship_status` (Single /
  // Married / Divorced / Widowed — the only values its enum table
  // accepts) PLUS the precise client value in ahavah_extra. The
  // upstream column collapses re-married -> Married; storing the exact
  // pick in ahavah_extra (and reading it back via the JSONB spread)
  // means a user who selects "Re-married" gets that back on reload.
  maritalStatus: (v) => {
    if (typeof v !== "string") return null;
    const mapped = MARITAL_STATUS_MAP[v];
    if (!mapped) return null;
    return {
      relationship_status: mapped,
      ahavah_extra: { maritalStatus: v },
    };
  },

  // Children: integer count. Writes BOTH the upstream coarse
  // `has_kids` (Yes/No — the only enum the backend column accepts)
  // AND the precise integer in ahavah_extra. Read-back prefers the
  // ahavah_extra value (via the JSONB spread) so user gets back
  // exactly what they entered (3, not "Yes" → 1). Two PATCHes go out
  // since translateOutbound iterates Object.entries() and the
  // backend enforces "one field per PATCH".
  children: (v) => {
    if (typeof v !== "number") return null;
    return {
      has_kids: v > 0 ? "Yes" : "No",
      ahavah_extra: { children: v },
    };
  },

  // Looking-for / intent — same dual-write pattern as children.
  // Backend's `looking_for` enum has only "Marriage" / "Long-term
  // dating" (loses Ahavah's 12-value Intent enum: first-wife,
  // additional-wife, unmarried-man, married-man, courtship, etc.).
  // Write the coarse value for any backend feature that filters on
  // looking_for, plus the precise enum in ahavah_extra so /profile
  // can render the exact phrasing the user picked.
  intent: (v) => {
    if (typeof v !== "string") return null;
    return {
      looking_for: INTENT_TO_LOOKING_FOR_MARRIAGE.has(v)
        ? "Marriage"
        : "Long-term dating",
      ahavah_extra: { intent: v },
    };
  },

  // Display name — optional preferred-name field separate from the
  // canonical firstName. Bundled into ahavah_extra so users can set a
  // "called by" name without overwriting their firstName (which the
  // backend uses for system messages, abuse reports, etc.).
  displayName: (v) => bundleExtra("displayName", v),

  // Bio -----------------------------------------------------------------
  bio: (v) => (typeof v === "string" && v.length > 0 ? { about: v } : null),

  // Occupation / education are 1:1 string renames.
  occupation: (v) =>
    typeof v === "string" && v.length > 0 ? { occupation: v } : null,
  education: (v) =>
    typeof v === "string" && v.length > 0 ? { education: v } : null,

  // Ethnicities — bundle into ahavah_extra. The upstream Duolicious
  // `ethnicity` column has a fixed 11-row enum table (Black/African
  // Descent, East Asian, Hispanic/Latino, etc.) which doesn't match
  // Ahavah's finer Torah-observant diaspora taxonomy (Afro-Caribbean,
  // Afro-American, West/East/Southern African, Mediterranean, etc.).
  // Trying to PATCH `{ ethnicity: "afro-caribbean" }` against that
  // table joins to zero rows + silently saves nothing. Storing in
  // ahavah_extra preserves the full multi-select array AND the
  // precise category names, same pattern as nationality/interests/
  // healthTags/etc. Backend reads it back via the ahavah_extra
  // JSONB spread in translateInbound.
  ethnicities: (v) => bundleExtra("ethnicities", v),

  // Languages — backend column is `languages_spoken TEXT[]` (migration
  // 0001). Pass through as-is; PatchProfileInfo accepts the array.
  // Custom-language tokens like "custom:Aramaic" are preserved verbatim
  // — backend stores them; the frontend reads them back via the same
  // path. Future cleanup could split out the prefixed tokens.
  languages: (v) => (Array.isArray(v) && v.length > 0 ? { languages_spoken: v } : null),

  // Primary language — backend column `primary_language` (DeepL target).
  primaryLanguage: (v) =>
    typeof v === "string" && v.length > 0 ? { primary_language: v } : null,

  // Torah-observant fields — Duolicious doesn't model these as columns,
  // so each gets bundled into a `ahavah_extra: { [key]: value }` PATCH
  // that the backend merges into the JSONB blob on the person row
  // (migration 0009). Single-field PATCH-per-call still satisfies the
  // upstream "exactly one field" validator because every entry below
  // becomes `{ ahavah_extra: {...} }`.
  assembly:           (v) => bundleExtra("assembly", v),
  torahLevel:         (v) => bundleExtra("torahLevel", v),
  shabbat:            (v) => bundleExtra("shabbat", v),
  feastDays:          (v) => bundleExtra("feastDays", v),
  calendar:           (v) => bundleExtra("calendar", v),
  polygyny:           (v) => bundleExtra("polygyny", v),
  headCovering:       (v) => bundleExtra("headCovering", v),
  tzitzit:            (v) => bundleExtra("tzitzit", v),
  familyViews:        (v) => bundleExtra("familyViews", v),
  livingPreferences:  (v) => bundleExtra("livingPreferences", v),
  healthTags:         (v) => bundleExtra("healthTags", v),
  interests:          (v) => bundleExtra("interests", v),
  personalityTraits:  (v) => bundleExtra("personalityTraits", v),
  relocation:         (v) => bundleExtra("relocation", v),
  communicationPrefs: (v) => bundleExtra("communicationPrefs", v),
  verificationTags:   (v) => bundleExtra("verificationTags", v),
  boundaryTags:       (v) => bundleExtra("boundaryTags", v),
  nationality:        (v) => bundleExtra("nationality", v),

  // City + state/province — bundle into ahavah_extra. The backend's
  // `location_short_friendly` is a derived "City, State, Country" string
  // built from the country lookup at signup; there's no first-class
  // column to PATCH city or state independently. Storing them in
  // ahavah_extra lets the editor round-trip the user's typed values
  // (so they don't disappear on save) and gives the peer view a path
  // to render finer locality if ever needed.
  city:               (v) => bundleExtra("city", v),
  stateOrProvince:    (v) => bundleExtra("stateOrProvince", v),

  // Photos go through photo-storage.ts (multipart-style PATCH); the
  // `photos` field here is the cached client-side list and should not
  // PATCH directly. Skip.
  photos: () => null,

  // Map visibility — persists to ahavah_extra.showOnMap so the user's
  // privacy choice survives cache clears, PWA reinstalls, and new
  // devices. Was previously localStorage-only (lib/use-show-on-map),
  // silently reverting to the default (true) on any storage wipe.
  // The /map page filters on showOnMap !== false; reading from server
  // via the ahavah_extra spread keeps that working.
  showOnMap: (v) => bundleExtra("showOnMap", typeof v === "boolean" ? v : null),
};

/** Helper: wrap a single Ahavah-specific field into the ahavah_extra
 *  PATCH shape. Empty arrays + null/undefined values send `null` so
 *  the backend's `||` JSONB merge clears the key when the user
 *  deselects everything in a multi-select. */
function bundleExtra(key: string, value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value) && value.length === 0) {
    return { ahavah_extra: { [key]: null } };
  }
  if (value === undefined || value === null) return null;
  return { ahavah_extra: { [key]: value } };
}

/**
 * Inbound translation: backend `GET /profile-info` returns space-separated
 * keys ("looking for", "relationship status", "has kids") with enum-value
 * strings ("Man", "Yes", "Long-term dating"). Map back to camelCase Profile
 * fields with value reverse-transforms.
 *
 * Per duo SQL Q_GET_PROFILE_INFO (service/person/sql/__init__.py:1637):
 *   name | about | gender | orientation | ethnicity | location | occupation |
 *   education | height | "looking for" | smoking | drinking | drugs |
 *   "long distance" | "relationship status" | "has kids" | "wants kids" |
 *   exercise | religion | "star sign" | "verification level" | photo | ...
 */
const MARITAL_STATUS_REVERSE: Record<string, string> = {
  Single: "never-married",
  Married: "married",
  Divorced: "divorced",
  Widowed: "widowed",
};

function reverseTranslateValue(
  clientKey: keyof Profile | string,
  serverValue: unknown,
): unknown {
  if (serverValue == null) return undefined;
  switch (clientKey) {
    case "sex":
      if (serverValue === "Woman") return "female";
      if (serverValue === "Man") return "male";
      return undefined;
    case "maritalStatus":
      return MARITAL_STATUS_REVERSE[serverValue as string] ?? undefined;
    case "children":
      // Lossy: backend tracks Yes/No only, not the integer count.
      // Restore 0 for "No", 1 for "Yes" so the completeness gate
      // sees a filled field. Precise count lives in the local cache
      // until the user explicitly edits it.
      if (serverValue === "No") return 0;
      if (serverValue === "Yes") return 1;
      return undefined;
    case "intent":
      // looking_for "Marriage" / "Long-term dating" / etc. — no inverse
      // that recovers the original intent enum cleanly. Leave undefined;
      // the local cache holds the precise value.
      return undefined;
    case "bio":
    case "occupation":
    case "education":
    case "location":
    case "firstName":
    case "primaryLanguage":
      return typeof serverValue === "string" ? serverValue : undefined;
    case "languages":
      // Backend ships back the same TEXT[] we sent in
      // languages_spoken — pass through as-is. Custom-language
      // tokens like "custom:Aramaic" survive verbatim.
      return Array.isArray(serverValue)
        ? (serverValue.filter((x) => typeof x === "string") as string[])
        : undefined;
    case "age":
      return typeof serverValue === "number" ? serverValue : undefined;
    case "dob":
      // Backend already serialises as YYYY-MM-DD.
      return typeof serverValue === "string" ? serverValue : undefined;
    case "photos": {
      // Backend `photo` field: sparse map `{ "1": uuid1, "2": uuid2, ... }`.
      // Convert to a position-ordered PhotoRecord[] so consumers reading
      // profile.photos[i].cdn_url get a real CDN URL. Holes (missing
      // positions) collapse — we don't preserve gaps, the UI doesn't need
      // them and the gradient fallback handles missing slots.
      if (
        serverValue === null ||
        typeof serverValue !== "object" ||
        Array.isArray(serverValue)
      ) {
        return undefined;
      }
      const entries = Object.entries(serverValue as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string" && (v as string).length > 0)
        .map(([k, v]) => [Number(k), v as string] as const)
        .filter(([k]) => Number.isFinite(k))
        .sort(([a], [b]) => a - b);
      const photos: PhotoRecord[] = entries.map(([position, uuid]) => ({
        uuid,
        cdn_url: cdnUrlFor(uuid),
        position,
        moderation_state: "approved",
        nsfw_score: null,
        created_at: "",
      }));
      return photos;
    }
    default:
      return serverValue;
  }
}

const SERVER_TO_CLIENT_KEY: Record<string, keyof Profile> = {
  // /me
  name: "firstName",
  // /profile-info (same key + space-keys)
  about: "bio",
  gender: "sex",
  // Backend serialises arrays / scalars under upstream Duolicious
  // names that don't match Profile field names. Without these
  // mappings, the value lands on `profile.languages_spoken` (where
  // nothing reads it) instead of `profile.languages` — so a user
  // who set languages in /onboarding sees an empty languages list
  // after a refresh.
  languages_spoken: "languages",
  primary_language: "primaryLanguage",
  // NOTE: server's upstream `ethnicity` (singular, scalar) is NOT
  // mapped to client's `ethnicities` — see TRANSFORMS comment for
  // ethnicities. Source of truth is `ahavah_extra.ethnicities`
  // (array), spread by the inbound translator below.
  "looking for": "intent",
  "relationship status": "maritalStatus",
  "has kids": "children",
  // /profile-info returns `photo` as a sparse `{ "1": uuid1, "2": uuid2 }`
  // map. Map it to the client-side `photos` array (PhotoRecord[]) so the
  // hero card + edit screen see the real uploads.
  photo: "photos",
  // Age + DOB now ship from /profile-info (Ahavah-specific Q_GET_PROFILE_INFO
  // additions) — without them the discover-eligibility gate redirected
  // post-onboarding users back to /onboarding/dob.
  age: "age",
  date_of_birth: "dob",
  // Phase W premium (Stripe Checkout). entitlements is the canonical
  // paywall-gate source per lib/profile-schema.ts isPremium().
  entitlements: "entitlements",
  subscription_expires_at: "subscriptionExpiresAt",
  stripe_customer_id: "stripeCustomerId",
  // Phase W cutover soft-delete grace. Surfaced via /profile banner +
  // POST /account/cancel-deletion CTA when set.
  deletion_requested_at: "deletionRequestedAt",
  // Operator roles — gates client-side visibility of /admin/* pages.
  // Server-side endpoints re-validate via the same column.
  roles: "roles",
};

function translateInbound(server: Partial<Profile> | Record<string, unknown>): Partial<Profile> {
  const out: Record<string, unknown> = {};

  // Two-pass read so ahavah_extra ALWAYS wins over upstream Duolicious
  // columns. Several fields write to BOTH locations for backward compat
  // (children → has_kids + ahavah_extra.children; intent → looking_for
  // + ahavah_extra.intent; ethnicities → ahavah_extra.ethnicities only,
  // upstream `ethnicity` column is no longer the source of truth) — the
  // upstream columns are coarse / lossy so we want the precise
  // ahavah_extra value to take precedence in the merged Profile.
  //
  // Pass 1: every key EXCEPT ahavah_extra.
  // Pass 2: spread ahavah_extra so its keys overwrite anything from
  //         pass 1.
  let extra: Record<string, unknown> | null = null;

  for (const [k, v] of Object.entries(server)) {
    if (k === "ahavah_extra") {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        extra = v as Record<string, unknown>;
      }
      continue;
    }
    const clientKey = SERVER_TO_CLIENT_KEY[k] ?? k;
    const value = reverseTranslateValue(clientKey, v);
    if (value !== undefined) out[clientKey] = value;
  }

  if (extra) {
    for (const [extraKey, extraVal] of Object.entries(extra)) {
      if (extraVal !== null && extraVal !== undefined) {
        out[extraKey] = extraVal;
      }
    }
  }

  return out as Partial<Profile>;
}

/**
 * Frontend keys the backend's PatchOnboardeeInfo schema accepts
 * (duotypes/__init__.py:281). All other fields are silently dropped
 * during onboarding — pydantic ignores unknown keys, then the
 * "exactly one field" validator counts ZERO known fields and 400s.
 * They get sync'd to /profile-info post-/finish-onboarding instead.
 */
const ONBOARDEE_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "firstName",      // -> name
  "dob",            // -> date_of_birth
  "location",       // -> location (long_friendly format)
  "sex",            // -> gender + other_peoples_genders
  // All Torah-observant fields bundle into ahavah_extra via the
  // TRANSFORMS entries above; the backend's PatchOnboardeeInfo now
  // accepts the same field, so wizard answers persist server-side
  // and survive /finish-onboarding by being copied onto person.
  "assembly", "torahLevel", "shabbat", "feastDays", "calendar",
  "polygyny", "headCovering", "tzitzit",
  "familyViews", "livingPreferences", "healthTags",
  "interests", "personalityTraits",
  "relocation", "communicationPrefs",
  "verificationTags", "boundaryTags",
  "nationality",
]);

function translateOutbound(
  patch: Partial<Profile>,
  options?: { onboardee?: boolean },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const onboardee = options?.onboardee ?? false;
  for (const [k, v] of Object.entries(patch)) {
    if (onboardee && !ONBOARDEE_ALLOWED_KEYS.has(k)) continue;
    const transform = TRANSFORMS[k];
    if (!transform) continue; // unmapped → client-only, no PATCH
    const entries = transform(v);
    if (!entries) continue;
    Object.assign(out, entries);
  }
  return out;
}

/** Read the current localStorage profile cache, falling back to empty. */
function readCachedOrEmpty(): Partial<Profile> {
  try {
    return loadProfileFromCache() ?? {};
  } catch {
    return {};
  }
}

/**
 * Phase W: the backend (`GET /me`) is the source of truth for the current
 * user's profile. localStorage is a CACHE used only to paint the UI
 * synchronously on first mount before the network round-trip resolves.
 *
 * Flow on mount:
 *   1. Initial state seeds from cache via `loadProfileFromCache()` (sync).
 *      May be `{}` if nothing is cached — that is a valid empty render.
 *   2. `refreshProfile()` fires immediately after mount, hits `/me`, and
 *      overwrites state + cache with the server's view. `loaded` flips to
 *      true once that completes (success OR failure).
 *   3. On 401, cache + state are cleared so we don't render stale data
 *      under a logged-out session.
 *
 * Mutations (`update` / `setProfile`) are optimistic-with-rollback:
 *   - State + cache update immediately.
 *   - PATCH `/profile-info` fires in the background.
 *   - On failure the previous values are restored AND the error is
 *     re-thrown so the caller can render an error toast / retry UI.
 *
 * `signOut` POSTs `/sign-out` (best-effort; ignore errors) then clears
 * cache + state. The httpOnly session cookie is killed server-side.
 *
 * External surface preserved: `{ profile, setProfile, update, loaded }`.
 * Added: `signOut`, `refreshProfile`.
 *
 * NOTE on `profile` typing: it is `Partial<Profile>`, not `Profile`. Every
 * Profile field is already optional in the schema, so this is type-compatible
 * with all 27 existing consumers, but the change makes explicit that "no
 * value yet" and "empty profile" can be the same thing during hydration.
 */
export type UseProfileResult = {
  profile: Partial<Profile>;
  setProfile: (next: Partial<Profile>) => Promise<void>;
  update: (patch: Partial<Profile>) => Promise<void>;
  loaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /**
   * Graduate the current onboardee into a full member by POSTing
   * /finish-onboarding, flipping the local ONBOARDED flag so subsequent
   * PATCHes route to /profile-info, and refreshing /me. Idempotent —
   * safe to call from /onboarding/complete on mount.
   */
  finishOnboarding: () => Promise<void>;
};

export function useProfile(): UseProfileResult {
  // Seed empty so SSR + first-client render match. The cache is read
  // in a post-mount effect below — without this gating, every consumer
  // that derives UI from `profile.X` triggers an SSR/CSR hydration
  // mismatch (server has no localStorage, client does). React then
  // bails out and re-renders the subtree, which intermittently breaks
  // event handler binding on radio cards / pickers / form controls.
  // Bug class first surfaced on /onboarding/country (2026-05-13);
  // moving the gate up to the hook fixes every cache-derived consumer
  // at once instead of per-page mounted-flag patches.
  const [profile, setProfileState] = useState<Partial<Profile>>({});
  const [loaded, setLoaded] = useState(false);
  // Last successful server snapshot — kept for debugging / future
  // reconciliation logic (e.g. server-wins conflict resolution). Not part
  // of the public surface.
  const lastServerSnapshot = useRef<Partial<Profile> | null>(null);
  // Mirror of `profile` that mutates synchronously inside `update()` so
  // concurrent calls (e.g. country page firing `update({country})` then
  // `update({location})` after a `/search-locations` await) each see the
  // latest committed state. Without this, both calls capture the same
  // pre-render `profile` snapshot and the second one clobbers the first.
  const profileRef = useRef<Partial<Profile>>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    // The localStorage `ahavah.onboarded` flag is a CACHE of server
    // truth, NOT the source of truth. We probe /me first — if the
    // backend treats the session as onboarded (returns 200 with a
    // person_uuid) we trust that, regardless of what the local flag
    // says. This is what makes "re-onboard on every sign-in" stop
    // happening: any time anything wipes localStorage (browser cache
    // clear, incognito-to-normal transition, SW unregister) but the
    // session cookie/token survives, /me restores the flag.
    //
    // If /me 401s (no session at all), or 400s ("Not authorized" for
    // onboardees who lack a person row), we leave the cache alone —
    // the wizard's optimistic state IS the source of truth during
    // onboarding and clobbering it would redirect users back to "fix"
    // a step they already completed locally.
    try {
      // /me is lean (just person_id + name post-Q&A-strip), so we
      // separately pull GET /profile-info for the full record (gender,
      // location, looking_for, relationship_status, has_kids, ...).
      // Run them in parallel; tolerate /profile-info failure.
      const [me, profileInfo] = await Promise.all([
        apiClient.get<Record<string, unknown>>("/me"),
        apiClient
          .get<Record<string, unknown>>("/profile-info")
          .catch(() => ({}) as Record<string, unknown>),
      ]);
      // Backfill the chat session's bare uuid. /check-otp returns
      // person_uuid: null for fresh onboardees (no person row yet), so
      // ahavah.my-uuid is missing for users who graduated via
      // /finish-onboarding. Without it `useInbox` sits in a permanent
      // skeleton and the chat WebSocket can't SASL-bind.
      const personUuid = typeof me.person_uuid === "string" ? me.person_uuid : null;
      if (personUuid) {
        writeChatSession({ myUuid: personUuid });
        // Self-heal: the backend says this user has a person row, so
        // they are onboarded. Restore the local flag if it was wiped.
        // Idempotent — re-writing "1" on every refresh is cheap.
        if (!readOnboarded()) writeOnboarded(true);
      }
      const translated = {
        ...translateInbound(me),
        ...translateInbound(profileInfo),
      };
      lastServerSnapshot.current = translated;
      // Merge — don't replace. The backend doesn't model the Torah fields
      // (assembly, polygyny, ...), so a wholesale setProfileState(translated)
      // would wipe what the wizard captured locally and the /discover
      // gate (firstMissingStepFor) would redirect us back to onboarding.
      setProfileState((prev) => ({ ...prev, ...translated }));
      saveProfileToCache({ ...readCachedOrEmpty(), ...translated });

      // BACK-SYNC: users who onboarded BEFORE the ahavah_extra column
      // existed on the backend have all their Torah-observant wizard
      // answers in localStorage only — nothing on the server. So when
      // someone else views their profile, it looks empty even though
      // the user filled the wizard. Detect this case here and push the
      // local fields up to ahavah_extra so the next /prospect-profile
      // call returns them.
      //
      // Fires only for onboarded users (no point during the wizard —
      // PATCHes route to /onboardee-info), and only when the local
      // cache has a value the server's ahavah_extra is missing. Idem-
      // potent: a subsequent refreshProfile sees the field on the
      // server side and skips it.
      if (personUuid) {
        const cache = readCachedOrEmpty() as Record<string, unknown>;
        const serverExtra =
          (profileInfo.ahavah_extra && typeof profileInfo.ahavah_extra === "object"
            ? (profileInfo.ahavah_extra as Record<string, unknown>)
            : {});
        const TORAH_FIELDS = [
          "assembly", "torahLevel", "shabbat", "feastDays", "calendar",
          "polygyny", "headCovering", "tzitzit",
          "familyViews", "livingPreferences", "healthTags",
          "interests", "personalityTraits",
          "relocation", "communicationPrefs",
          "verificationTags", "boundaryTags",
          "nationality",
        ] as const;
        const toSync: Record<string, unknown> = {};
        for (const k of TORAH_FIELDS) {
          const local = cache[k];
          const remote = serverExtra[k];
          // Consider "local has a value, server doesn't" as needs-sync.
          // Empty arrays count as "no answer" — skip; the user just
          // hasn't filled this multi-select.
          const localHasValue =
            local !== undefined &&
            local !== null &&
            local !== "" &&
            !(Array.isArray(local) && local.length === 0);
          const serverHasValue =
            remote !== undefined &&
            remote !== null &&
            !(Array.isArray(remote) && remote.length === 0);
          if (localHasValue && !serverHasValue) {
            toSync[k] = local;
          }
        }
        if (Object.keys(toSync).length > 0) {
          // Fire-and-forget — failure is non-fatal (next refresh will
          // try again). Don't await: keeps refreshProfile snappy.
          void apiClient
            .patch("/profile-info", { ahavah_extra: toSync })
            .catch(() => {
              // Quiet fail — the merge is best-effort.
            });
        }
      }
    } catch (err) {
      // 401 from /me means EITHER (a) session expired post-onboarding,
      // (b) we're an onboardee (no person row yet → /me decorator
      // returns 401). Tell them apart by what the local cache+flag said
      // at the time of the request:
      //   - flag set → user WAS onboarded → 401 = session truly expired,
      //     clear the cache so a stale snapshot doesn't paint.
      //   - flag unset → user is an onboardee; keep their wizard cache
      //     untouched. /me 401 here is expected and harmless.
      // Non-401 errors are swallowed so the app stays usable offline.
      if (
        err instanceof ApiError &&
        err.status === 401 &&
        readOnboarded()
      ) {
        clearProfileCache();
        setProfileState({});
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Hydrate state from localStorage AFTER mount. This is what was
    // previously the useState initialiser; moving it here is the
    // SSR/CSR-safe form. Without this, every consumer that derives UI
    // from `profile.X` triggers a hydration mismatch (server has no
    // localStorage; client does).
    const cached = loadProfileFromCache();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileState(cached);
      profileRef.current = cached;
    }
    // Then fire the network-side hydration. Syncing React state with an
    // external system (the backend) is the canonical use case for
    // `useEffect`.
    void refreshProfile();
  }, [refreshProfile]);

  const update = useCallback(
    async (patch: Partial<Profile>) => {
      // Read from ref (synchronously up-to-date) NOT from the closure
      // `profile` (one render behind during back-to-back calls).
      const prev = profileRef.current;
      const next = { ...prev, ...patch };
      profileRef.current = next;
      // Optimistic: paint the patched state immediately.
      setProfileState(next);
      saveProfileToCache(next);
      // Translate to the backend's shape AND respect "exactly one field per
      // PATCH" by fanning out. During onboarding only a narrow set is
      // allowed (PatchOnboardeeInfo); everything else gets dropped here
      // and sync'd post-/finish-onboarding. Empty translation = client-
      // only field, no network call.
      const onboardee = !readOnboarded();
      const translated = translateOutbound(patch, { onboardee });
      const entries = Object.entries(translated);
      if (entries.length === 0) {
        lastServerSnapshot.current = next;
        return;
      }
      // Route to /onboardee-info vs /profile-info based on whether the user
      // has finished onboarding. Backend enforces this distinction via
      // `expected_onboarding_status` decorator — calling the wrong endpoint
      // returns 400 "Not authorized" and we'd roll the input back.
      const endpoint = onboardee ? "/onboardee-info" : "/profile-info";
      try {
        for (const [k, v] of entries) {
          await apiClient.patch(endpoint, { [k]: v });
        }
        lastServerSnapshot.current = next;
      } catch (err) {
        // Do NOT rollback the optimistic state. The user just typed
        // "Ehud"; rolling back to prev erases the input visually for a
        // problem they can't see (auth failure, server hiccup, etc.) and
        // makes the wizard feel broken. localStorage cache still holds
        // the latest, and a future successful PATCH (or /finish-onboarding)
        // will sync it. Rethrow so callers that DO care (e.g. final
        // submit) can react.
        throw err;
      }
    },
    // `profileRef` is a ref — stable across renders. No `profile` dep
    // needed and dropping it makes `update` referentially stable for
    // downstream useCallback/useEffect deps.
    [],
  );

  const setProfile = useCallback(
    async (next: Partial<Profile>) => {
      const prev = profile;
      setProfileState(next);
      saveProfileToCache(next);
      try {
        // Only send fields that actually changed. Avoids overwriting
        // server-only fields (id, created_at, etc.) the client never
        // touches but `/me` may echo back.
        const diff: Partial<Profile> = {};
        const prevRec = prev as Record<string, unknown>;
        const nextRec = next as Record<string, unknown>;
        for (const key of Object.keys(next) as Array<keyof Profile>) {
          const k = key as string;
          if (nextRec[k] !== prevRec[k]) {
            (diff as Record<string, unknown>)[k] = nextRec[k];
          }
        }
        // Translate + fan out one-PATCH-per-field (see `update` for why).
        const onboardee = !readOnboarded();
        const translated = translateOutbound(diff, { onboardee });
        const endpoint = onboardee ? "/onboardee-info" : "/profile-info";
        for (const [k, v] of Object.entries(translated)) {
          await apiClient.patch(endpoint, { [k]: v });
        }
        lastServerSnapshot.current = next;
      } catch (err) {
        // Same reasoning as `update` above — keep the optimistic state.
        throw err;
      }
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    try {
      await apiClient.post("/sign-out", {});
    } catch {
      // Server-side sign-out may fail (network, already expired session)
      // but the local cleanup below MUST happen regardless or we leave
      // the UI in a logged-in-looking state.
    }
    clearProfileCache();
    clearChatSession();
    setSessionToken(null);
    clearOnboarded();
    setProfileState({});
    lastServerSnapshot.current = null;
  }, []);

  const finishOnboarding = useCallback(async () => {
    // Idempotent guard: backend's /finish-onboarding has an
    // `expected_onboarding_status` decorator that 400s for already-graduated
    // users. Re-visiting /onboarding/complete would otherwise always show
    // "We couldn't finalise your profile". When the local flag says we're
    // already onboarded, skip the POST + the post-graduation sync (those
    // fields already landed on the person row) and just refresh /me.
    if (readOnboarded()) {
      await refreshProfile();
      return;
    }
    await apiClient.post("/finish-onboarding", {});
    writeOnboarded(true);
    // Post-graduation sync: PATCH the fields the onboardee schema didn't
    // accept (relationship_status, has_kids, looking_for, about, ...) so
    // they land on the now-existing person row. One PATCH per mapped
    // entry, errors swallowed individually — a single broken field
    // shouldn't block reaching /discover.
    const translated = translateOutbound(profileRef.current, { onboardee: false });
    for (const [k, v] of Object.entries(translated)) {
      try {
        await apiClient.patch("/profile-info", { [k]: v });
      } catch {
        // tolerate — the field stays in local cache, user can refine
        // from /profile/edit later.
      }
    }
    await refreshProfile();
  }, [refreshProfile]);

  return {
    profile,
    setProfile,
    update,
    loaded,
    signOut,
    refreshProfile,
    finishOnboarding,
  };
}
