/**
 * Curated language list. Covers the most widely-spoken languages globally
 * (~70 entries) so a typical user finds theirs without falling through to
 * a free-text add. The custom-add path (CUSTOM_PREFIX) stays for rare /
 * regional languages users may still want to declare.
 *
 * Ordering: native speakers + diaspora reach. Caribbean / African /
 * Hebrew Israelite audience priorities surface earlier (English, Spanish,
 * French, Portuguese, Haitian Creole, Yoruba, Igbo, Hausa, Hebrew, etc.)
 * but the list is deliberately broad — language is a personal identity
 * signal, not just a "popular in this region" picker.
 */
export type LanguageOption = {
  code: string;
  label: string;
  flag: string;
};

export const LANGUAGES: ReadonlyArray<LanguageOption> = [
  // Anglophone + major European
  { code: "en", label: "English",             flag: "🇬🇧" },
  { code: "es", label: "Spanish",             flag: "🇪🇸" },
  { code: "fr", label: "French",              flag: "🇫🇷" },
  { code: "pt", label: "Portuguese",          flag: "🇵🇹" },
  { code: "de", label: "German",              flag: "🇩🇪" },
  { code: "it", label: "Italian",             flag: "🇮🇹" },
  { code: "nl", label: "Dutch",               flag: "🇳🇱" },
  { code: "ru", label: "Russian",             flag: "🇷🇺" },
  { code: "pl", label: "Polish",              flag: "🇵🇱" },
  { code: "uk", label: "Ukrainian",           flag: "🇺🇦" },
  { code: "ro", label: "Romanian",            flag: "🇷🇴" },
  { code: "el", label: "Greek",               flag: "🇬🇷" },
  { code: "sv", label: "Swedish",             flag: "🇸🇪" },
  { code: "no", label: "Norwegian",           flag: "🇳🇴" },
  { code: "da", label: "Danish",              flag: "🇩🇰" },
  { code: "fi", label: "Finnish",             flag: "🇫🇮" },
  { code: "cs", label: "Czech",               flag: "🇨🇿" },
  { code: "hu", label: "Hungarian",           flag: "🇭🇺" },

  // Caribbean / Latin America
  { code: "ht", label: "Haitian Creole",      flag: "🇭🇹" },
  { code: "jam", label: "Jamaican Patois",    flag: "🇯🇲" },
  { code: "pap", label: "Papiamento",         flag: "🇨🇼" },

  // Sub-Saharan Africa
  { code: "sw", label: "Swahili",             flag: "🇹🇿" },
  { code: "yo", label: "Yoruba",              flag: "🇳🇬" },
  { code: "ig", label: "Igbo",                flag: "🇳🇬" },
  { code: "ha", label: "Hausa",               flag: "🇳🇬" },
  { code: "am", label: "Amharic",             flag: "🇪🇹" },
  { code: "ti", label: "Tigrinya",            flag: "🇪🇷" },
  { code: "zu", label: "Zulu",                flag: "🇿🇦" },
  { code: "xh", label: "Xhosa",               flag: "🇿🇦" },
  { code: "af", label: "Afrikaans",           flag: "🇿🇦" },
  { code: "so", label: "Somali",              flag: "🇸🇴" },
  { code: "rw", label: "Kinyarwanda",         flag: "🇷🇼" },
  { code: "lg", label: "Luganda",             flag: "🇺🇬" },
  { code: "sn", label: "Shona",               flag: "🇿🇼" },
  { code: "ny", label: "Chichewa",            flag: "🇲🇼" },
  { code: "tw", label: "Twi",                 flag: "🇬🇭" },
  { code: "ee", label: "Ewe",                 flag: "🇬🇭" },
  { code: "wo", label: "Wolof",               flag: "🇸🇳" },
  { code: "ff", label: "Fula",                flag: "🇸🇳" },
  { code: "mg", label: "Malagasy",            flag: "🇲🇬" },

  // Middle East / Near East — relevant for Hebrew Israelite audience
  { code: "he", label: "Hebrew",              flag: "🇮🇱" },
  { code: "ar", label: "Arabic",              flag: "🇸🇦" },
  { code: "tr", label: "Turkish",             flag: "🇹🇷" },
  { code: "fa", label: "Persian (Farsi)",     flag: "🇮🇷" },
  { code: "ku", label: "Kurdish",             flag: "🇮🇶" },
  { code: "yi", label: "Yiddish",             flag: "🇮🇱" },
  { code: "lad", label: "Ladino",             flag: "🇮🇱" },
  { code: "arc", label: "Aramaic",            flag: "🇮🇱" },

  // South Asia
  { code: "hi", label: "Hindi",               flag: "🇮🇳" },
  { code: "ur", label: "Urdu",                flag: "🇵🇰" },
  { code: "bn", label: "Bengali",             flag: "🇧🇩" },
  { code: "pa", label: "Punjabi",             flag: "🇮🇳" },
  { code: "gu", label: "Gujarati",            flag: "🇮🇳" },
  { code: "ta", label: "Tamil",               flag: "🇱🇰" },
  { code: "te", label: "Telugu",              flag: "🇮🇳" },
  { code: "ml", label: "Malayalam",           flag: "🇮🇳" },
  { code: "kn", label: "Kannada",             flag: "🇮🇳" },
  { code: "mr", label: "Marathi",             flag: "🇮🇳" },
  { code: "si", label: "Sinhala",             flag: "🇱🇰" },
  { code: "ne", label: "Nepali",              flag: "🇳🇵" },

  // East + Southeast Asia
  { code: "zh", label: "Mandarin",            flag: "🇨🇳" },
  { code: "yue", label: "Cantonese",          flag: "🇭🇰" },
  { code: "ja", label: "Japanese",            flag: "🇯🇵" },
  { code: "ko", label: "Korean",              flag: "🇰🇷" },
  { code: "vi", label: "Vietnamese",          flag: "🇻🇳" },
  { code: "th", label: "Thai",                flag: "🇹🇭" },
  { code: "id", label: "Indonesian",          flag: "🇮🇩" },
  { code: "ms", label: "Malay",               flag: "🇲🇾" },
  { code: "tl", label: "Tagalog",             flag: "🇵🇭" },
  { code: "my", label: "Burmese",             flag: "🇲🇲" },
  { code: "km", label: "Khmer",               flag: "🇰🇭" },
  { code: "lo", label: "Lao",                 flag: "🇱🇦" },

  // Sign languages
  { code: "ase", label: "American Sign Language", flag: "🤟" },
  { code: "bsl", label: "British Sign Language",  flag: "🤟" },
];

/**
 * Prefix marker for user-added custom languages (stored in
 * `profile.languages` as `${CUSTOM_PREFIX}${label}`). Used by
 * /onboarding/languages' free-text adder and preserved by the
 * /profile/edit picker for unknown stored values.
 */
export const CUSTOM_LANGUAGE_PREFIX = "custom:";

/** Friendly label for any stored language code. */
export function labelForLanguage(code: string): string {
  if (code.startsWith(CUSTOM_LANGUAGE_PREFIX)) {
    return code.slice(CUSTOM_LANGUAGE_PREFIX.length);
  }
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
