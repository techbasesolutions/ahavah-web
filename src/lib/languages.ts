/**
 * Built-in shortlist of languages surfaced as multi-select pills. Anything
 * outside this list is added by the user via the free-text adder on
 * /onboarding/languages (custom values prefixed with `CUSTOM_PREFIX`).
 */
export type LanguageOption = {
  code: string;
  label: string;
  flag: string;
};

export const LANGUAGES: ReadonlyArray<LanguageOption> = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "es", label: "Spanish",    flag: "🇪🇸" },
  { code: "fr", label: "French",     flag: "🇫🇷" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "de", label: "German",     flag: "🇩🇪" },
  { code: "it", label: "Italian",    flag: "🇮🇹" },
  { code: "nl", label: "Dutch",      flag: "🇳🇱" },
  { code: "ja", label: "Japanese",   flag: "🇯🇵" },
  { code: "zh", label: "Mandarin",   flag: "🇨🇳" },
  { code: "ko", label: "Korean",     flag: "🇰🇷" },
  { code: "ar", label: "Arabic",     flag: "🇸🇦" },
  { code: "hi", label: "Hindi",      flag: "🇮🇳" },
  { code: "he", label: "Hebrew",     flag: "🇮🇱" },
  { code: "ru", label: "Russian",    flag: "🇷🇺" },
];

/**
 * Prefix marker for user-added custom languages (stored in
 * `profile.languages` as `${CUSTOM_PREFIX}${label}`). Lets us preserve
 * built-in vs custom distinction across the two editors.
 */
export const CUSTOM_LANGUAGE_PREFIX = "custom:";

/** Friendly label for any stored language code. */
export function labelForLanguage(code: string): string {
  if (code.startsWith(CUSTOM_LANGUAGE_PREFIX)) {
    return code.slice(CUSTOM_LANGUAGE_PREFIX.length);
  }
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
