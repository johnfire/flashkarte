import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AccountSection } from "./settings/AccountSection";
import { PasswordSection } from "./settings/PasswordSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { LanguageSection } from "./settings/LanguageSection";
import { ApiKeysSection } from "./settings/ApiKeysSection";
import { DataExportSection } from "./settings/DataExportSection";
import { DangerZoneSection } from "./settings/DangerZoneSection";

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← {t("common.decks")}
        </Link>
      </header>

      <AccountSection />
      <PasswordSection />
      <AppearanceSection />
      <LanguageSection />
      <ApiKeysSection />
      <DataExportSection />
      <DangerZoneSection />
    </div>
  );
}
