import { gradientsFor } from "@/lib/profile-gradients";
import type { PhotoRecord } from "@/lib/photo-types";

type PhotoableProfile = {
  firstName?: string;
  photos?: ReadonlyArray<PhotoRecord>;
};

export type PhotoSource =
  | { kind: "photo"; src: string }
  | { kind: "gradient"; css: string };

/**
 * Resolves a profile's photo at the requested slot. Falls back to the
 * deterministic gradient stamp if no photo is uploaded at that slot OR
 * the photo at that slot has no CDN URL (e.g. just uploaded, server
 * hasn't confirmed yet).
 *
 * `seed` for gradientsFor() defaults to the profile's lowercased
 * firstName so the same profile always gets the same gradient across
 * re-renders.
 *
 * Photos with an empty cdn_url (pending UUID assignment) are treated as
 * missing so a stale placeholder doesn't render as a broken img.
 */
export function photoOrGradient(
  profile: PhotoableProfile,
  slotIndex = 0,
): PhotoSource {
  const photo = profile.photos?.[slotIndex];
  if (photo && photo.cdn_url && photo.cdn_url.length > 0) {
    return { kind: "photo", src: photo.cdn_url };
  }
  const seed = profile.firstName?.toLowerCase() ?? "x";
  const gradients = gradientsFor(seed);
  const gradient = gradients[slotIndex % gradients.length];
  return { kind: "gradient", css: gradient };
}
