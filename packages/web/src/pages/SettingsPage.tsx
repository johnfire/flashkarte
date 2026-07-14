import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ApiKey, CreatedApiKey, AccountType } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/useTheme";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PasswordInput } from "../components/PasswordInput";

const MCP_URL =
  import.meta.env.VITE_MCP_URL ??
  "https://mcp.flashkarte.christopherrehm.de/mcp";

const PLAN_LABEL_KEY: Record<AccountType, string> = {
  free: "settings.plan_free",
  paid: "settings.plan_paid",
  "admin-gifted": "settings.plan_gifted",
  admin: "settings.plan_admin",
};

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("My AI");
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function changePassword() {
    setPasswordChanged(false);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(t("settings.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    setChangingPassword(true);
    try {
      const { user } = await api.auth.changePassword(
        currentPassword,
        newPassword,
      );
      updateUser(user);
      setPasswordChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError
          ? err.message
          : t("settings.changePasswordError"),
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function saveDisplayName() {
    setSavingName(true);
    setNameSaved(false);
    setError(null);
    try {
      const { user } = await api.auth.updateProfile(displayName.trim());
      updateUser(user);
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

  const load = useCallback(async () => {
    setError(null);
    try {
      setKeys(await api.keys.list());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.loadKeysError"),
      );
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const key = await api.keys.create(newName.trim() || "My AI");
      setCreated(key);
      setKeys((k) => (k ? [{ ...key }, ...k] : [key]));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.createKeyError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(prefix: string) {
    if (!window.confirm(t("settings.revokeConfirm"))) return;
    try {
      await api.keys.revoke(prefix);
      setKeys((k) => (k ? k.filter((x) => x.key_prefix !== prefix) : k));
      if (created?.key_prefix === prefix) setCreated(null);
    } catch {
      window.alert(t("settings.revokeError"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← {t("common.decks")}
        </Link>
      </header>

      {user && (
        <section className="mb-8 rounded-lg border p-4">
          <h2 className="mb-1 text-xl font-semibold">
            {t("settings.account")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {user.email}
          </p>
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
        </section>
      )}

      {user && (
        <section className="mb-8 rounded-lg border p-4">
          <h2 className="mb-1 text-xl font-semibold">
            {t("settings.changePassword")}
          </h2>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            {t("settings.changePasswordHint")}
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="current-password"
                className="mb-1 block text-sm font-medium"
              >
                {t("settings.currentPassword")}
              </label>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                ariaLabel={t("settings.currentPassword")}
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium"
              >
                {t("settings.newPassword")}
              </label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={8}
                ariaLabel={t("settings.newPassword")}
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium"
              >
                {t("settings.confirmPassword")}
              </label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                minLength={8}
                ariaLabel={t("settings.confirmPassword")}
              />
            </div>
            <button
              onClick={changePassword}
              disabled={
                changingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {changingPassword ? "…" : t("settings.changePasswordButton")}
            </button>
          </div>
          {passwordChanged && (
            <p className="mt-2 text-sm text-green-600">
              {t("settings.passwordChanged")}
            </p>
          )}
          {passwordError && (
            <p className="mt-2 text-sm text-red-600">{passwordError}</p>
          )}
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/forgot-password" className="text-indigo-600">
              {t("settings.forgotPasswordLink")}
            </Link>
          </p>
        </section>
      )}

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-1 text-xl font-semibold">
          {t("settings.appearance")}
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          {t("settings.appearanceHint")}
        </p>
        <div className="inline-flex overflow-hidden rounded-lg border">
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={`px-4 py-2 text-sm font-medium ${
              theme === "light"
                ? "bg-indigo-600 text-white"
                : "bg-transparent text-gray-600 dark:text-gray-300"
            }`}
          >
            {t("settings.light")}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={`px-4 py-2 text-sm font-medium ${
              theme === "dark"
                ? "bg-indigo-600 text-white"
                : "bg-transparent text-gray-600 dark:text-gray-300"
            }`}
          >
            {t("settings.dark")}
          </button>
        </div>
      </section>

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-1 text-xl font-semibold">{t("language.label")}</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          {t("settings.languageHint")}
        </p>
        <LanguageSwitcher />
      </section>

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-1 text-xl font-semibold">
          {t("settings.connectAI")}
        </h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          {t("settings.connectAIHint")}
        </p>
        <p className="mb-2 text-sm">
          {t("settings.mcpUrlLabel")}{" "}
          <code className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
            {MCP_URL}
          </code>
        </p>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t("settings.claudeAiHint")} <em>{t("settings.claudeAiExample")}</em>
        </p>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("settings.keyNamePlaceholder")}
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "…" : t("settings.generateKey")}
          </button>
        </div>

        {created && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="mb-1 text-sm font-medium text-amber-800">
              {t("settings.copyKeyWarning")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white dark:bg-gray-800 px-2 py-1 text-sm">
                {created.key}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(created.key)}
                className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white"
              >
                {t("settings.copy")}
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("settings.yourKeys")}</h2>
        {error && <p className="mb-3 text-red-600">{error}</p>}
        {keys === null && !error && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("common.loading")}
          </p>
        )}
        {keys && keys.length === 0 && !error && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("settings.noKeys")}
          </p>
        )}
        <ul className="space-y-2">
          {keys?.map((k) => (
            <li
              key={k.key_prefix}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <code>{k.key_prefix}…</code> · {t("settings.created")}{" "}
                  {new Date(k.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => revoke(k.key_prefix)}
                className="text-sm text-red-600"
              >
                {t("settings.revoke")}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
