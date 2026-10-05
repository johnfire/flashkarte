import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { PromoBenefitFields, type PromoBenefit } from "./PromoBenefitFields";

export function AddPromoForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [benefit, setBenefit] = useState<PromoBenefit>({
    kind: "discount",
    percentOff: 20,
    discountDuration: "once",
    eligiblePlan: "any",
    freeDays: 30,
  });
  const [expiry, setExpiry] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const limits = {
        code: code.trim().toUpperCase(),
        expiresAt: expiry ? new Date(expiry).toISOString() : null,
        maxActivations: limit ? Number(limit) : null,
      };
      await api.admin.createPromo(
        benefit.kind === "free_access"
          ? { ...limits, kind: "free_access", freeDays: benefit.freeDays }
          : {
              ...limits,
              kind: "discount",
              percentOff: benefit.percentOff,
              discountDuration: benefit.discountDuration,
              eligiblePlan: benefit.eligiblePlan,
            },
      );
      setCode("");
      onCreated();
    } catch (creationError) {
      setError(
        creationError instanceof ApiError
          ? creationError.message
          : t("promos.createError"),
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border px-3 py-2";
  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-medium">{t("promos.create")}</legend>
        <label className="block text-sm">
          {t("promos.code")}
          <input
            className={inputClass}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            minLength={3}
            maxLength={40}
            pattern="[A-Za-z0-9_-]{3,40}"
            autoCapitalize="characters"
          />
        </label>
        <PromoBenefitFields benefit={benefit} onChange={setBenefit} />
        <label className="block text-sm">
          {t("promos.expiry")}
          <input
            className={inputClass}
            type="datetime-local"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          {t("promos.limit")}
          <input
            className={inputClass}
            type="number"
            min={1}
            max={1000000}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </label>
      </fieldset>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t("promos.limitNote")}
      </p>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? "…" : t("promos.create")}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
