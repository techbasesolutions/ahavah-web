import { gradientsFor } from "@/lib/profile-gradients";

type PhotoableProfile = {
  firstName?: string;
  photos?: ReadonlyArray<string>;
};

export type PhotoSource =
  | { kind: "photo"; src: string }
  | { kind: "gradient"; css: string };

/**
 * Resolves a profile's photo at the requested slot. Falls back to the
 * deterministic gradient stamp if no photo is uploaded at that slot.
 * `seed` for gradientsFor() defaults to the profile's lowercased
 * firstName so the same profile always gets the same gradient across
 * re-renders.
 *
 * Empty-string entries in photos[] are treated as missing (so a stale
 * placeholder doesn't render as a broken img).
 */
export function photoOrGradient(
  profile: PhotoableProfile,
  slotIndex = 0,
): PhotoSource {
  const uploaded = profile.photos?.[slotIndex];
  if (uploaded && uploaded.length > 0) {
    return { kind: "photo", src: uploaded };
  }
  const seed = profile.firstName?.toLowerCase() ?? "x";
  const gradients = gradientsFor(seed);
  const gradient = gradients[slotIndex % gradients.length];
  return { kind: "gradient", css: gradient };
}
