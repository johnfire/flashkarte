export const SUPPORTED_LOCALES = ["en", "de", "fr", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const FALLBACK_LOCALE: SupportedLocale = "en";

export function resolveLocale(tag: string | null | undefined): SupportedLocale {
  if (!tag) return FALLBACK_LOCALE;
  const base = tag.toLowerCase().split("-")[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as SupportedLocale)
    : FALLBACK_LOCALE;
}
