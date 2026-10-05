import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { SignupPromo } from "../../api/promo-types";
import { useAsync } from "../../hooks/use-async";
import { AddPromoForm } from "./AddPromoForm";

export function PromosSection() {
  const { t, i18n } = useTranslation();
  const loadPromos = useCallback(() => api.admin.listPromos(), []);
  const { data: listing, error: loadError, reload } = useAsync(loadPromos, []);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function togglePromo(promo: SignupPromo) {
    setBusyId(promo.id);
    setError(null);
    try {
      await api.admin.setPromoActive(promo.id, !promo.active);
      await reload();
    } catch (updateError) {
      setError(
        updateError instanceof ApiError
          ? updateError.message
          : t("promos.updateError"),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <h2 className="text-xl font-semibold">{t("promos.title")}</h2>
      <AddPromoForm onCreated={() => void reload()} />
      {(loadError || error) && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error ?? t("promos.loadError")}
        </p>
      )}
      {listing?.promos.length === 0 && <p>{t("promos.empty")}</p>}
      <ul className="space-y-3">
        {listing?.promos.map((promo) => (
          <li
            key={promo.id}
            className="rounded-lg border p-3 text-sm space-y-1"
          >
            <p className="font-semibold">
              {promo.code} ·{" "}
              {t(promo.active ? "promos.active" : "promos.paused")}
            </p>
            <p>
              {promo.kind === "free_access"
                ? t("promos.freeSummary", { days: promo.freeDays })
                : t("promos.discountSummary", {
                    percent: promo.percentOff,
                    duration: t(`promos.${promo.discountDuration}`),
                  })}
            </p>
            {promo.kind === "discount" && (
              <p>
                {t("promos.eligiblePlan")}:{" "}
                {t(
                  promo.eligiblePlan === "any"
                    ? "promos.anyPlan"
                    : `billing.${promo.eligiblePlan}`,
                )}
              </p>
            )}
            <p>
              {t("promos.uses", {
                count: promo.activationCount,
                limit: promo.maxActivations ?? "∞",
              })}
            </p>
            <p>
              {t("promos.expires", {
                date: promo.expiresAt
                  ? new Date(promo.expiresAt).toLocaleString(i18n.language)
                  : t("promos.noExpiry"),
              })}
            </p>
            <button
              type="button"
              onClick={() => void togglePromo(promo)}
              disabled={busyId !== null}
              aria-label={t(
                promo.active ? "promos.pauseCode" : "promos.resumeCode",
                { code: promo.code },
              )}
              className="rounded-lg border px-3 py-1 disabled:opacity-50"
            >
              {busyId === promo.id
                ? "…"
                : t(promo.active ? "promos.pause" : "promos.resume")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
