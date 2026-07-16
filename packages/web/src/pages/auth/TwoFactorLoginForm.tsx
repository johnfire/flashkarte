import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";

interface Props {
  challenge: string;
  rememberMe: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Code-entry step shown when login answered with a 2FA challenge. */
export function TwoFactorLoginForm({
  challenge,
  rememberMe,
  onSuccess,
  onCancel,
}: Props) {
  const { completeTwoFactorLogin } = useAuth();
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeTwoFactorLogin(challenge, code.trim(), rememberMe);
      onSuccess();
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("auth.twoFactorPrompt")}
        </p>
        <label htmlFor="twofactor-code" className="sr-only">
          {t("auth.twoFactorCode")}
        </label>
        <input
          id="twofactor-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          placeholder={t("auth.twoFactorCode")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : t("auth.twoFactorVerify")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-indigo-600"
        >
          {t("common.cancel")}
        </button>
      </form>
    </div>
  );
}
