import { useTranslation } from "react-i18next";
import { useTheme } from "../../theme/useTheme";

export function AppearanceSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <section className="mb-8 rounded-lg border p-4">
      <h2 className="mb-1 text-xl font-semibold">
        {t("settings.appearance")}
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.appearanceHint")}
      </p>
      <div className="inline-flex overflow-hidden rounded-lg border">
        <ThemeButton
          active={theme === "light"}
          onClick={() => setTheme("light")}
          label={t("settings.light")}
        />
        <ThemeButton
          active={theme === "dark"}
          onClick={() => setTheme("dark")}
          label={t("settings.dark")}
        />
      </div>
    </section>
  );
}

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function ThemeButton({ active, onClick, label }: ThemeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 text-sm font-medium ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-transparent text-gray-600 dark:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}
