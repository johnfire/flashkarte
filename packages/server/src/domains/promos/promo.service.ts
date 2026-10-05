import crypto from "crypto";
import { z } from "zod";
import { withTransaction } from "../../db/client";
import { parse } from "../../utils/validate";
import { ValidationError } from "../../utils/errors";
import { recordRequired } from "../audit/audit.service";
import type { AuditActor } from "../audit/audit.types";
import * as stripe from "../billing/stripe.provider";
import * as repository from "./promo.repository";
import { promoCodeSchema, validatePromo } from "./promo.validation";

export function presentPromo(promo: repository.PromoRow) {
  return {
    id: promo.id,
    code: promo.code,
    kind: promo.kind,
    percentOff: promo.percent_off,
    discountDuration: promo.discount_duration,
    freeDays: promo.free_days,
    eligiblePlan: promo.eligible_plan,
    expiresAt: promo.expires_at,
    maxActivations: promo.max_activations,
    activationCount: promo.activation_count,
    active: promo.active,
  };
}

export async function listPromos() {
  return (await repository.listPromos()).map(presentPromo);
}

export async function previewPromo(codeInput: unknown) {
  const code = parse(promoCodeSchema, codeInput);
  const promo = await repository.findAvailablePromo(code);
  if (!promo)
    throw new ValidationError(
      "Promo code is invalid, expired, paused, or fully used",
    );
  const { kind, percentOff, discountDuration, freeDays, eligiblePlan } =
    presentPromo(promo);
  return { code, kind, percentOff, discountDuration, freeDays, eligiblePlan };
}

export async function createPromo(input: unknown, actor: AuditActor) {
  const promo = validatePromo(input);
  if (await repository.codeExists(promo.code))
    throw new ValidationError("This promo code already exists");
  const id = crypto.randomUUID();
  const couponId =
    promo.kind === "discount"
      ? await stripe.createPromoCoupon(id, promo)
      : null;
  return withTransaction(async (client) => {
    const created = await repository.insertPromo(client, id, promo, couponId);
    await recordRequired(
      {
        actor,
        action: "admin.promo_created",
        targetType: "signup_promo",
        targetId: id,
        afterState: presentPromo(created),
      },
      client,
    );
    return presentPromo(created);
  }).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new ValidationError("This promo code already exists");
    }
    throw error;
  });
}

export async function setPromoActive(
  idInput: unknown,
  activeInput: unknown,
  actor: AuditActor,
) {
  const id = parse(z.string().uuid(), idInput);
  const active = parse(z.boolean(), activeInput);
  return withTransaction(async (client) => {
    const updated = await repository.setPromoActive(client, id, active);
    await recordRequired(
      {
        actor,
        action: "admin.promo_active_changed",
        targetType: "signup_promo",
        targetId: id,
        afterState: { active },
      },
      client,
    );
    return presentPromo(updated);
  });
}
