import { useTranslation } from "react-i18next";
import type { useSignupPromo } from "./use-signup-promo";

export function SignupPromoField({
  selection,
  disabled,
}: {
  selection: ReturnType<typeof useSignupPromo>;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { code, promo, applying, error, changeCode, applyCode } = selection;
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <label htmlFor="signup-promo" className="block text-sm font-medium">
        {t("promos.code")}
      </label>
      <div className="flex gap-2">
        <input
          id="signup-promo"
          value={code}
          onChange={(event) => changeCode(event.target.value)}
          maxLength={40}
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="button"
          disabled={applying || !code.trim()}
          onClick={() => (promo ? changeCode("") : void applyCode())}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          {applying ? "…" : t(promo ? "promos.remove" : "promos.apply")}
        </button>
      </div>
      {promo && (
        <div
          role="status"
          className="text-sm text-green-700 dark:text-green-300"
        >
          <p>{t("promos.applied", { code: promo.code })}</p>
          <p>
            {promo.kind === "free_access"
              ? t("promos.freeSummary", { days: promo.freeDays })
              : t("promos.discountSummary", {
                  percent: promo.percentOff,
                  duration: t(`promos.${promo.discountDuration}`),
                })}
          </p>
          {promo.kind === "free_access" && <p>{t("promos.freeNote")}</p>}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}
