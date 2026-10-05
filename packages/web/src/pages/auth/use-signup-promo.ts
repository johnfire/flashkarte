import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { PromoPreview } from "../../api/promo-types";
import type { SignupPlan } from "./SignupPlanPicker";

export function useSignupPromo() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<SignupPlan>("free");
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  function changeCode(nextCode: string) {
    requestVersion.current += 1;
    setCode(nextCode);
    setPromo(null);
    setError(null);
    setApplying(false);
  }

  async function applyCode() {
    const version = ++requestVersion.current;
    setApplying(true);
    setError(null);
    try {
      const preview = await api.auth.previewPromo(code.trim());
      if (requestVersion.current !== version) return;
      setPromo(preview);
      setCode(preview.code);
      if (preview.kind === "free_access") setPlan("free");
      else if (preview.eligiblePlan !== "any") setPlan(preview.eligiblePlan);
      else if (plan === "free") setPlan("monthly");
    } catch (previewError) {
      if (requestVersion.current === version)
        setError(
          previewError instanceof ApiError
            ? previewError.message
            : t("promos.invalid"),
        );
    } finally {
      if (requestVersion.current === version) setApplying(false);
    }
  }

  return { plan, setPlan, code, promo, applying, error, changeCode, applyCode };
}
