import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { BillingStatus, BillingUnit } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { PromoStatus } from "./PromoStatus";

export function BillingSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [units, setUnits] = useState<BillingUnit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<"monthly" | "yearly" | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([api.billing.status(), api.billing.units()]).then(
      ([statusResult, unitsResult]) => {
        if (statusResult.status === "fulfilled") {
          setStatus(statusResult.value);
        } else {
          setError(
            statusResult.reason instanceof ApiError
              ? statusResult.reason.message
              : t("billing.loadError"),
          );
        }
        if (unitsResult.status === "fulfilled") {
          setUnits(unitsResult.value);
        } else {
          setError(
            unitsResult.reason instanceof ApiError
              ? unitsResult.reason.message
              : t("billing.loadError"),
          );
        }
      },
    );
  }, [t, user]);

  if (!user || !status) {
    return error ? <p className="text-sm text-red-600">{error}</p> : null;
  }

  async function checkout(plan: "monthly" | "yearly") {
    setBusyPlan(plan);
    setError(null);
    try {
      const { url } = await api.billing.checkout(plan);
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("billing.checkoutError"),
      );
      setBusyPlan(null);
    }
  }

  async function setUnitActive(unit: BillingUnit, active: boolean) {
    setError(null);
    try {
      const updated = await api.billing.setUnitActive(
        unit.unit_type,
        unit.unit_id,
        active,
      );
      setUnits((current) =>
        current.map((candidate) =>
          candidate.unit_id === updated.unit_id &&
          candidate.unit_type === updated.unit_type
            ? updated
            : candidate,
        ),
      );
      setStatus((current) =>
        current && current.activeUnitLimit !== null
          ? {
              ...current,
              activeUnitCount: current.activeUnitCount + (active ? 1 : -1),
              overLimit:
                current.activeUnitCount + (active ? 1 : -1) >
                current.activeUnitLimit,
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("billing.unitError"));
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    setError(null);
    try {
      const { url } = await api.billing.portal();
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("billing.portalError"),
      );
      setPortalBusy(false);
    }
  }

  const unitSummary =
    status.activeUnitLimit === null
      ? t("billing.unlimited")
      : `${status.activeUnitCount} / ${status.activeUnitLimit}`;

  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-xl font-semibold">{t("billing.title")}</h2>
      <PromoStatus status={status} />
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {t("billing.activeUnits", { units: unitSummary })}
      </p>
      {status.overLimit && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          {t("billing.overLimit")}
        </p>
      )}
      {status.plan === "paid" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            {t("billing.paidPlan")}
          </p>
          {status.subscription?.provider === "stripe" && (
            <button
              type="button"
              onClick={openPortal}
              disabled={portalBusy}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
            >
              {portalBusy ? "…" : t("billing.manageSubscription")}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => checkout("monthly")}
            disabled={busyPlan !== null}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busyPlan === "monthly" ? "…" : t("billing.monthly")}
          </button>
          <button
            type="button"
            onClick={() => checkout("yearly")}
            disabled={busyPlan !== null}
            className="rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-700 disabled:opacity-50 dark:text-indigo-300"
          >
            {busyPlan === "yearly" ? "…" : t("billing.yearly")}
          </button>
        </div>
      )}
      {units.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium">{t("billing.manageUnits")}</h3>
          <ul className="mt-2 space-y-2">
            {units.map((unit) => (
              <li
                key={`${unit.unit_type}-${unit.unit_id}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className={unit.active ? "" : "text-gray-500"}>
                  {unit.title}
                </span>
                <button
                  type="button"
                  onClick={() => setUnitActive(unit, !unit.active)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  {unit.active
                    ? t("billing.deactivate")
                    : t("billing.activate")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
