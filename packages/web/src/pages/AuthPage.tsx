import { useState, FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

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
  const [showPassword, setShowPassword] = useState(false);
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

        <input
          type="email"
          required
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
            aria-pressed={showPassword}
            title={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

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
