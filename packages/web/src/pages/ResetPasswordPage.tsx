import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t("resetPassword.missingToken"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("resetPassword.genericError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white dark:bg-gray-800 p-8 shadow">
        <h1 className="text-2xl font-bold">{t("resetPassword.title")}</h1>
        {done ? (
          <p className="text-sm text-green-600">{t("resetPassword.done")}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder={t("resetPassword.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? t("resetPassword.hidePassword")
                    : t("resetPassword.showPassword")
                }
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword
                  ? t("resetPassword.hide")
                  : t("resetPassword.show")}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? t("resetPassword.submitting") : t("resetPassword.submit")}
            </button>
            <Link
              to="/login"
              className="block text-center text-sm text-indigo-600"
            >
              {t("resetPassword.backToSignIn")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
