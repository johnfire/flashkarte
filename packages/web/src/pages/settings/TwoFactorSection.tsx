import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { TwoFactorEnrollFlow } from "./TwoFactorEnrollFlow";

type Step = "idle" | "enroll" | "disable";

export function TwoFactorSection() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState<Step>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = user?.twoFactorEnabled ?? false;

  function fail(err: unknown) {
    setError(
      err instanceof ApiError ? err.message : t("settings.twoFactorError"),
    );
  }

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.auth.twoFactorSetup();
      setQrDataUrl(r.qrDataUrl);
      setOtpauthUri(r.otpauthUri);
      setStep("enroll");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setBusy(true);
    setError(null);
    try {
      await api.auth.twoFactorDisable(code.trim());
      setStep("idle");
      setCode("");
      if (user) updateUser({ ...user, twoFactorEnabled: false });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-xl font-semibold">
        {t("settings.twoFactor")}{" "}
        <span
          className={
            enabled
              ? "align-middle rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
              : "align-middle rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }
        >
          {enabled ? t("settings.twoFactorOn") : t("settings.twoFactorOff")}
        </span>
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.twoFactorHint")}
      </p>

      {step === "idle" && !enabled && (
        <button
          type="button"
          onClick={startSetup}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {t("settings.twoFactorEnableButton")}
        </button>
      )}

      {step === "idle" && enabled && (
        <button
          type="button"
          onClick={() => {
            setCode("");
            setError(null);
            setStep("disable");
          }}
          className="rounded-lg border border-red-600 px-4 py-2 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          {t("settings.twoFactorDisableButton")}
        </button>
      )}

      {step === "enroll" && (
        <TwoFactorEnrollFlow
          qrDataUrl={qrDataUrl}
          otpauthUri={otpauthUri}
          onEnabled={() => {
            if (user) updateUser({ ...user, twoFactorEnabled: true });
          }}
          onDone={() => setStep("idle")}
        />
      )}

      {step === "disable" && (
        <div className="space-y-3">
          <p className="text-sm">{t("settings.twoFactorDisablePrompt")}</p>
          <label
            htmlFor="twofactor-disable-code"
            className="mb-1 block text-sm font-medium"
          >
            {t("settings.twoFactorCodeLabel")}
          </label>
          <input
            id="twofactor-disable-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full max-w-xs rounded-lg border px-3 py-2"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={confirmDisable}
              disabled={busy || !code.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {t("settings.twoFactorDisableConfirm")}
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              disabled={busy}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
