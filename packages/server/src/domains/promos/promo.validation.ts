import { z } from "zod";
import { parse } from "../../utils/validate";
import { ValidationError } from "../../utils/errors";

export const promoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,40}$/);
const commonFields = {
  code: promoCodeSchema,
  expiresAt: z.iso.datetime().nullable().default(null),
  maxActivations: z
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .nullable()
    .default(null),
};
const promoSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...commonFields,
      kind: z.literal("discount"),
      percentOff: z.number().int().min(1).max(100),
      discountDuration: z.enum(["once", "forever"]),
      eligiblePlan: z.enum(["any", "monthly", "yearly"]),
    })
    .strict(),
  z
    .object({
      ...commonFields,
      kind: z.literal("free_access"),
      freeDays: z.number().int().min(1).max(365),
    })
    .strict(),
]);

export type PromoInput = z.infer<typeof promoSchema>;
export type SignupPlan = "free" | "monthly" | "yearly";

export function validatePromo(input: unknown): PromoInput {
  const promo = parse(promoSchema, input);
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) {
    throw new ValidationError("Promo expiry must be in the future");
  }
  return promo;
}

export function validateSignupPlan(input: unknown): SignupPlan {
  return parse(z.enum(["free", "monthly", "yearly"]), input ?? "free");
}
