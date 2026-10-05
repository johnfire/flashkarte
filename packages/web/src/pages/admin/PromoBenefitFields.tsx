import { useTranslation } from "react-i18next";

export interface PromoBenefit {
  kind: "discount" | "free_access";
  percentOff: number;
  discountDuration: "once" | "forever";
  eligiblePlan: "any" | "monthly" | "yearly";
  freeDays: number;
}

export function PromoBenefitFields({
  benefit,
  onChange,
}: {
  benefit: PromoBenefit;
  onChange: (benefit: PromoBenefit) => void;
}) {
  const { t } = useTranslation();
  const inputClass = "mt-1 w-full rounded-lg border px-3 py-2";
  return (
    <>
      <label className="block text-sm">
        {t("promos.kind")}
        <select
          aria-label={t("promos.kind")}
          className={inputClass}
          value={benefit.kind}
          onChange={(event) =>
            onChange({
              ...benefit,
              kind: event.target.value as PromoBenefit["kind"],
            })
          }
        >
          <option value="discount">{t("promos.discount")}</option>
          <option value="free_access">{t("promos.freeAccess")}</option>
        </select>
      </label>
      {benefit.kind === "free_access" ? (
        <label className="block text-sm">
          {t("promos.freeDays")}
          <input
            className={inputClass}
            required
            type="number"
            min={1}
            max={365}
            value={benefit.freeDays}
            onChange={(event) =>
              onChange({ ...benefit, freeDays: Number(event.target.value) })
            }
          />
        </label>
      ) : (
        <>
          <label className="block text-sm">
            {t("promos.percentOff")}
            <input
              className={inputClass}
              required
              type="number"
              min={1}
              max={100}
              value={benefit.percentOff}
              onChange={(event) =>
                onChange({ ...benefit, percentOff: Number(event.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            {t("promos.duration")}
            <select
              aria-label={t("promos.duration")}
              className={inputClass}
              value={benefit.discountDuration}
              onChange={(event) =>
                onChange({
                  ...benefit,
                  discountDuration: event.target
                    .value as PromoBenefit["discountDuration"],
                })
              }
            >
              <option value="once">{t("promos.once")}</option>
              <option value="forever">{t("promos.forever")}</option>
            </select>
          </label>
          <label className="block text-sm">
            {t("promos.eligiblePlan")}
            <select
              aria-label={t("promos.eligiblePlan")}
              className={inputClass}
              value={benefit.eligiblePlan}
              onChange={(event) =>
                onChange({
                  ...benefit,
                  eligiblePlan: event.target
                    .value as PromoBenefit["eligiblePlan"],
                })
              }
            >
              <option value="any">{t("promos.anyPlan")}</option>
              <option value="monthly">{t("billing.monthly")}</option>
              <option value="yearly">{t("billing.yearly")}</option>
            </select>
          </label>
        </>
      )}
    </>
  );
}
