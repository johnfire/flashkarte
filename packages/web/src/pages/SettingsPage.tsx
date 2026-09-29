import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AccountSection } from "./settings/AccountSection";
import { PasswordSection } from "./settings/PasswordSection";
import { AppearanceSection } from "./settings/AppearanceSection";
import { LanguageSection } from "./settings/LanguageSection";
import { SpeechSection } from "./settings/SpeechSection";
import { ApiKeysSection } from "./settings/ApiKeysSection";
import { TwoFactorSection } from "./settings/TwoFactorSection";
import { DataExportSection } from "./settings/DataExportSection";
import { DangerZoneSection } from "./settings/DangerZoneSection";

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← {t("common.decks")}
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <div className="space-y-6">
          <AccountSection />
          <PasswordSection />
          <TwoFactorSection />
        </div>
        <div className="space-y-6">
          <AppearanceSection />
          <LanguageSection />
          <SpeechSection />
        </div>
        <div className="space-y-6">
          <ApiKeysSection />
          <DataExportSection />
          <DangerZoneSection />
        </div>
      </div>
    </div>
  );
}
