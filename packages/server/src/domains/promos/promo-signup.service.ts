import type { PoolClient } from "pg";
import { parse } from "../../utils/validate";
import { ValidationError } from "../../utils/errors";
import { recordRequired, userActor } from "../audit/audit.service";
import * as repository from "./promo.repository";
import { promoCodeSchema, type SignupPlan } from "./promo.validation";

export function parseSignupPromoCode(input: unknown): string | undefined {
  if (input === undefined || input === "") return undefined;
  return parse(promoCodeSchema, input);
}

export function assertPromoPlan(promo: repository.PromoRow, plan: SignupPlan) {
  if (promo.kind === "free_access") {
    if (plan !== "free")
      throw new ValidationError(
        "Free-access promos do not require a paid plan",
      );
    return;
  }
  if (plan === "free")
    throw new ValidationError("Choose a paid plan to use this discount");
  if (promo.eligible_plan !== "any" && promo.eligible_plan !== plan) {
    throw new ValidationError(
      `This promo is for the ${promo.eligible_plan} plan`,
    );
  }
}

export async function activateSignupPromo(
  client: PoolClient,
  userId: string,
  code: string,
  plan: SignupPlan,
) {
  const promo = await repository.claimPromo(client, code);
  assertPromoPlan(promo, plan);
  await repository.insertActivation(client, userId, promo, plan);
  await recordRequired(
    {
      actor: userActor(userId),
      action: "signup.promo_activated",
      targetType: "signup_promo",
      targetId: promo.id,
      afterState: {
        kind: promo.kind,
        signupPlan: plan,
        freeDays: promo.free_days,
      },
    },
    client,
  );
}
