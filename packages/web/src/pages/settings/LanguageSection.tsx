import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";

export function LanguageSection() {
  const { t } = useTranslation();

  return (
    <section className="mb-8 rounded-lg border p-4">
      <h2 className="mb-1 text-xl font-semibold">{t("language.label")}</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.languageHint")}
      </p>
      <LanguageSwitcher />
    </section>
  );
}
