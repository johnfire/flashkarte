import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { setLanguage } from "../i18n/setLanguage";
import { SUPPORTED_LOCALES } from "../i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const { authed } = useAuth();
  const current = i18n.language;

  return (
    <select
      aria-label={t("language.label")}
      value={SUPPORTED_LOCALES.includes(current as never) ? current : "en"}
      onChange={(e) => setLanguage(e.target.value, { authed })}
      className={
        compact
          ? "rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200"
          : "rounded-lg border px-3 py-2 text-sm"
      }
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <option key={loc} value={loc} className="text-black">
          {t(`language.${loc}`)}
        </option>
      ))}
    </select>
  );
}
