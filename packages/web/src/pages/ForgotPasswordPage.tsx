import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
    } catch {
      // Intentionally ignore — the response is uniform either way.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white dark:bg-gray-800 p-8 shadow">
        <h1 className="text-2xl font-bold">{t("forgotPassword.title")}</h1>
        {sent ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("forgotPassword.sent")}
            </p>
            <Link to="/login" className="inline-block text-sm text-indigo-600">
              {t("forgotPassword.backToSignIn")}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("forgotPassword.instructions")}
            </p>
            <input
              type="email"
              required
              placeholder={t("forgotPassword.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy
                ? t("forgotPassword.submitting")
                : t("forgotPassword.submit")}
            </button>
            <Link
              to="/login"
              className="block text-center text-sm text-indigo-600"
            >
              {t("forgotPassword.backToSignIn")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
