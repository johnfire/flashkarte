import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const PLAN_LABEL_KEY: Record<string, string> = {
  free: "settings.plan_free",
  paid: "settings.plan_paid",
  "admin-gifted": "settings.plan_gifted",
  admin: "settings.plan_admin",
};

export function AccountSection() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  if (!user) return null;

  async function saveDisplayName() {
    setSavingName(true);
    setNameSaved(false);
    setError(null);
    try {
      const { user: updated } = await api.auth.updateProfile({
        displayName: displayName.trim(),
      });
      updateUser(updated);
      setNameSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("settings.saveDisplayNameError"),
      );
    } finally {
      setSavingName(false);
    }
  }

  async function requestEmailChange() {
    setSavingEmail(true);
    setEmailMessage(null);
    try {
      await api.auth.requestEmailChange(currentPassword, newEmail.trim());
      setCurrentPassword("");
      setEmailMessage(t("settings.emailChangeSent"));
    } catch (err) {
      setEmailMessage(
        err instanceof ApiError ? err.message : t("settings.changeEmailError"),
      );
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <section className="mb-8 rounded-lg border p-4">
      <h2 className="mb-1 text-xl font-semibold">{t("settings.account")}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
      <p className="mt-2 text-sm">
        {t("settings.plan")}{" "}
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          {t(PLAN_LABEL_KEY[user.accountType]) ?? user.accountType}
        </span>
      </p>

      <label className="mt-4 block text-sm font-medium">
        {t("settings.displayName")}
      </label>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        {t("settings.displayNameHint")}
      </p>
      <div className="flex gap-2">
        <input
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setNameSaved(false);
          }}
          maxLength={60}
          placeholder={t("settings.displayNamePlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="button"
          onClick={saveDisplayName}
          disabled={savingName}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {savingName ? "…" : t("common.save")}
        </button>
      </div>
      {nameSaved && (
        <p className="mt-1 text-sm text-green-600">{t("common.saved")}</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-6 border-t pt-4">
        <h3 className="font-medium">{t("settings.changeEmail")}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("settings.changeEmailHint")}
        </p>
        <div className="mt-3 space-y-2">
          <input
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder={t("settings.newEmail")}
            className="w-full rounded-lg border px-3 py-2"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder={t("settings.currentPassword")}
            className="w-full rounded-lg border px-3 py-2"
          />
          <button
            type="button"
            onClick={requestEmailChange}
            disabled={savingEmail || !newEmail || !currentPassword}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {savingEmail ? "…" : t("settings.changeEmailButton")}
          </button>
        </div>
        {emailMessage && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {emailMessage}
          </p>
        )}
      </div>
    </section>
  );
}
