import { useTranslation } from "react-i18next";

export type ContentLanguageChoice = "all" | "en" | "de" | "ar";

const CHOICES: { code: ContentLanguageChoice; label: string }[] = [
  { code: "all", label: "All" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

export function contentLanguageLabel(language: string | null | undefined) {
  return CHOICES.find(({ code }) => code === language)?.label ?? null;
}

export function ContentLanguageSwitcher({
  value,
  onChange,
}: {
  value: ContentLanguageChoice;
  onChange: (language: ContentLanguageChoice) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("contentLanguage.label")}
      className="my-5 flex flex-wrap gap-2"
    >
      {CHOICES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={value === code}
          className={`rounded-full border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${value === code ? "border-indigo-700 bg-indigo-700 text-white" : "border-gray-300 text-gray-800 dark:border-gray-600 dark:text-gray-100"}`}
        >
          {code === "all" ? t("contentLanguage.all") : label}
        </button>
      ))}
    </div>
  );
}

export function ContentLanguageField({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (language: "en" | "de" | "ar") => void;
}) {
  const { t } = useTranslation();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{t("contentLanguage.label")}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value as "en" | "de" | "ar")}
        className="rounded border bg-white px-2 py-1 text-gray-900 dark:bg-gray-900 dark:text-white"
      >
        <option value="" disabled>
          {t("contentLanguage.choose")}
        </option>
        {CHOICES.filter(({ code }) => code !== "all").map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
