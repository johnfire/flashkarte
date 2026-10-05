export interface PromoPreview {
  code: string;
  kind: "discount" | "free_access";
  percentOff: number | null;
  discountDuration: "once" | "forever" | null;
  freeDays: number | null;
  eligiblePlan: "any" | "monthly" | "yearly";
}

export interface SignupPromoChoice {
  promoCode: string;
  signupPlan: "free" | "monthly" | "yearly";
}

export interface SignupPromo extends PromoPreview {
  id: string;
  expiresAt: string | null;
  maxActivations: number | null;
  activationCount: number;
  active: boolean;
}

interface PromoLimits {
  code: string;
  expiresAt: string | null;
  maxActivations: number | null;
}

export type CreatePromo = PromoLimits &
  (
    | { kind: "free_access"; freeDays: number }
    | {
        kind: "discount";
        percentOff: number;
        discountDuration: "once" | "forever";
        eligiblePlan: "any" | "monthly" | "yearly";
      }
  );
