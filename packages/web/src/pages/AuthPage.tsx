import { useState, FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { api, ApiError } from "../api/client";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PasswordInput } from "../components/PasswordInput";
import { TwoFactorLoginForm } from "./auth/TwoFactorLoginForm";
import { SignupOptions } from "./auth/SignupOptions";
import { useSignupPromo } from "./auth/use-signup-promo";
import { AuthFooter } from "./auth/AuthFooter";

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
  const promoSelection = useSignupPromo();
  const { plan: signupPlan, promo, code, applying } = promoSelection;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasCreatedAccount, setHasCreatedAccount] = useState(false);
  // Non-null while the server is waiting for the second factor.
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<string | null>(
    null,
  );

  async function completeSignup() {
    if (!hasCreatedAccount) {
      if (promo)
        await signup(email, password, { promoCode: promo.code, signupPlan });
      else await signup(email, password);
      setHasCreatedAccount(true);
    }
    if (signupPlan === "free") return false;
    const { url } = await api.billing.checkout(signupPlan);
    window.location.assign(url);
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signup" && code.trim() && !promo) {
      setError(t("promos.applyFirst"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await login(email, password, rememberMe);
        if (result?.requiresTwoFactor) {
          setTwoFactorChallenge(result.challenge);
          return;
        }
      } else if (await completeSignup()) return;
      navigate(safeNext(params.get("next")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  }

  if (twoFactorChallenge) {
    return (
      <TwoFactorLoginForm
        challenge={twoFactorChallenge}
        rememberMe={rememberMe}
        onSuccess={() => navigate(safeNext(params.get("next")))}
        onCancel={() => setTwoFactorChallenge(null)}
      />
    );
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

        <fieldset disabled={busy || hasCreatedAccount} className="space-y-4">
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
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
            ariaLabel={t("auth.passwordPlaceholder")}
            placeholder={t("auth.passwordPlaceholder")}
          />
        </fieldset>

        {mode === "signup" && (
          <SignupOptions
            selection={promoSelection}
            disabled={busy || hasCreatedAccount}
          />
        )}

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
        {hasCreatedAccount && error && (
          <p role="status" className="text-sm">
            {t("promos.retryNote")}
          </p>
        )}

        <button
          type="submit"
          disabled={
            busy ||
            (mode === "signup" && (applying || Boolean(code.trim() && !promo)))
          }
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy
            ? "…"
            : mode === "login"
              ? t("auth.signIn")
              : hasCreatedAccount
                ? t("promos.retryCheckout")
                : t("auth.signUp")}
        </button>

        <button
          type="button"
          disabled={busy || hasCreatedAccount}
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            promoSelection.changeCode("");
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

        <AuthFooter />
      </form>
    </div>
  );
}
