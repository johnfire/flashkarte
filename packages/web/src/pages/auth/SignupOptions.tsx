import { SignupPromoField } from "./SignupPromoField";
import { SignupPlanPicker } from "./SignupPlanPicker";
import type { useSignupPromo } from "./use-signup-promo";

export function SignupOptions({
  selection,
  disabled,
}: {
  selection: ReturnType<typeof useSignupPromo>;
  disabled: boolean;
}) {
  const { promo, plan, setPlan } = selection;
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <SignupPromoField selection={selection} disabled={disabled} />
      {promo?.kind !== "free_access" && (
        <SignupPlanPicker
          value={plan}
          onChange={setPlan}
          allowedPlans={
            promo
              ? promo.eligiblePlan === "any"
                ? ["monthly", "yearly"]
                : [promo.eligiblePlan]
              : undefined
          }
        />
      )}
    </fieldset>
  );
}
