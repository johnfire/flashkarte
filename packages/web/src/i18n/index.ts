import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { SUPPORTED_LOCALES, FALLBACK_LOCALE } from "./resolveLocale";
import en from "./locales/en.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";

export { SUPPORTED_LOCALES } from "./resolveLocale";
export type { SupportedLocale } from "./resolveLocale";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
    },
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

// Keep <html lang> in sync with the active language so screen readers and
// translation tools narrate/handle the content in the right language.
function syncDocumentLang(lng: string): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = (lng || FALLBACK_LOCALE).split("-")[0];
  }
}
i18n.on("languageChanged", syncDocumentLang);
syncDocumentLang(i18n.language || FALLBACK_LOCALE);

export default i18n;
