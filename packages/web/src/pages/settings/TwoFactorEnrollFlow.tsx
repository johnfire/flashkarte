import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";

interface Props {
  qrDataUrl: string;
  otpauthUri: string;
  onEnabled: () => void;
  onDone: () => void;
}

/**
 * Pairing + confirmation steps of 2FA enrollment: show the QR, verify one
 * code, then reveal the one-time backup codes.
 */
export function TwoFactorEnrollFlow({
  qrDataUrl,
  otpauthUri,
  onEnabled,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmEnable() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.auth.twoFactorEnable(code.trim());
      setBackupCodes(r.backupCodes);
      onEnabled();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.twoFactorError"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (backupCodes) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {t("settings.twoFactorBackupWarning")}
        </p>
        <ul className="grid max-w-xs grid-cols-2 gap-1 rounded-lg border p-3 font-mono text-sm">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(backupCodes.join("\n"))}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
        >
          {t("settings.twoFactorCopyCodes")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ml-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          {t("settings.twoFactorDone")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">{t("settings.twoFactorScan")}</p>
      <img
        src={qrDataUrl}
        alt={t("settings.twoFactorQrAlt")}
        className="h-40 w-40 rounded bg-white p-1"
      />
      <details className="text-xs text-gray-500 dark:text-gray-400">
        <summary>{t("settings.twoFactorCantScan")}</summary>
        <code className="break-all">{otpauthUri}</code>
      </details>
      <label
        htmlFor="twofactor-enable-code"
        className="mb-1 block text-sm font-medium"
      >
        {t("settings.twoFactorCodeLabel")}
      </label>
      <input
        id="twofactor-enable-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        className="w-full max-w-xs rounded-lg border px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={confirmEnable}
          disabled={busy || !code.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("settings.twoFactorConfirmButton")}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={busy}
          className="rounded-lg border px-4 py-2 text-sm font-medium"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
