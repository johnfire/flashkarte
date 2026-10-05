import { useTranslation } from "react-i18next";

export type SignupPlan = "free" | "monthly" | "yearly";

interface SignupPlanPickerProps {
  value: SignupPlan;
  onChange: (plan: SignupPlan) => void;
  allowedPlans?: SignupPlan[];
}

export function SignupPlanPicker({
  value,
  onChange,
  allowedPlans,
}: SignupPlanPickerProps) {
  const { t } = useTranslation();
  const plans: Array<{ value: SignupPlan; label: string }> = [
    { value: "free", label: t("auth.freePlan") },
    { value: "monthly", label: t("auth.monthlyPlan") },
    { value: "yearly", label: t("auth.yearlyPlan") },
  ];

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("auth.choosePlan")}</legend>
      {plans
        .filter((plan) => !allowedPlans || allowedPlans.includes(plan.value))
        .map((plan) => (
          <label
            key={plan.value}
            className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm"
          >
            <input
              type="radio"
              name="signup-plan"
              value={plan.value}
              checked={value === plan.value}
              onChange={() => onChange(plan.value)}
              className="mt-0.5"
            />
            <span>{plan.label}</span>
          </label>
        ))}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("auth.paidPlanCheckoutNote")}
      </p>
    </fieldset>
  );
}
