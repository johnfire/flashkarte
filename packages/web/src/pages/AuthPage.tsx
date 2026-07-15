import { useState, FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PasswordInput } from "../components/PasswordInput";

/**
 * Resolve a post-auth redirect target from an untrusted `?next=` param. Only
 * same-origin absolute paths are allowed; protocol-relative (`//`, `/\`) and
 * scheme URLs are rejected to prevent open redirects. Defaults to "/".
 */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

export function AuthPage() {
  const { login, signup } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    params.get("mode") === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password, rememberMe);
      else await signup(email, password);
      navigate(safeNext(params.get("next")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white dark:bg-gray-800 p-8 shadow"
      >
        <h1 className="text-2xl font-bold">flashkarte</h1>
        <div className="flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mode === "login"
            ? t("auth.signInToAccount")
            : t("auth.createAccount")}
        </p>

        <label htmlFor="email" className="sr-only">
          {t("auth.email")}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          ariaLabel={t("auth.passwordPlaceholder")}
          placeholder={t("auth.passwordPlaceholder")}
        />

        {mode === "login" && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded"
            />
            {t("auth.keepLoggedIn")}
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : mode === "login" ? t("auth.signIn") : t("auth.signUp")}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="w-full text-sm text-indigo-600"
        >
          {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
        </button>

        {mode === "login" && (
          <Link
            to="/forgot-password"
            className="block text-center text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600"
          >
            {t("auth.forgotPassword")}
          </Link>
        )}

        <p className="space-x-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <Link
            to="/guide"
            className="hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t("common.guide")}
          </Link>
          <Link
            to="/privacy"
            className="hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t("common.privacy")}
          </Link>
          <Link
            to="/impressum"
            className="hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t("common.impressum")}
          </Link>
        </p>
      </form>
    </div>
  );
}
