import { useTranslation } from "react-i18next";
import type { BillingStatus } from "../../api/types";

export function PromoStatus({ status }: { status: BillingStatus }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="mt-2 text-sm" role="status">
      {status.promoAccessEndsAt && (
        <p>
          {t("promos.endsAt", {
            date: new Date(status.promoAccessEndsAt).toLocaleDateString(
              i18n.language,
            ),
          })}
        </p>
      )}
      {status.signupDiscount && (
        <p>
          {t("promos.savedDiscount", {
            code: status.signupDiscount.code,
            percent: status.signupDiscount.percentOff,
            plan: t(`billing.${status.signupDiscount.plan}`),
            duration: t(`promos.${status.signupDiscount.discountDuration}`),
          })}
        </p>
      )}
    </div>
  );
}
