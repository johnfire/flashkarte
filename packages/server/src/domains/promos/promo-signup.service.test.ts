jest.mock("./promo.repository");
jest.mock("../audit/audit.service");
import type { PoolClient } from "pg";
import * as repository from "./promo.repository";
import { recordRequired, userActor } from "../audit/audit.service";
import {
  activateSignupPromo,
  assertPromoPlan,
  parseSignupPromoCode,
} from "./promo-signup.service";

const CLIENT = {} as PoolClient;
const FREE_PROMO: repository.PromoRow = {
  id: "p1",
  code: "FREE30",
  kind: "free_access",
  free_days: 30,
  percent_off: null,
  discount_duration: null,
  stripe_coupon_id: null,
  eligible_plan: "any",
  expires_at: null,
  max_activations: null,
  activation_count: 0,
  active: true,
};
const DISCOUNT = {
  ...FREE_PROMO,
  kind: "discount" as const,
  free_days: null,
  percent_off: 20,
  discount_duration: "once" as const,
  stripe_coupon_id: "coupon-1",
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(repository.claimPromo).mockResolvedValue(FREE_PROMO);
  jest.mocked(userActor).mockImplementation((id) => ({ type: "user", id }));
});

test("parses optional codes without treating malformed input as no promo", () => {
  expect(parseSignupPromoCode(undefined)).toBeUndefined();
  expect(parseSignupPromoCode("")).toBeUndefined();
  expect(parseSignupPromoCode(" free30 ")).toBe("FREE30");
  expect(() => parseSignupPromoCode({ code: "FREE30" })).toThrow();
});

test("requires the free plan for free access", () => {
  expect(() => assertPromoPlan(FREE_PROMO, "free")).not.toThrow();
  expect(() => assertPromoPlan(FREE_PROMO, "monthly")).toThrow(
    "do not require",
  );
});

test("discounts require an eligible paid plan", () => {
  expect(() => assertPromoPlan(DISCOUNT, "free")).toThrow("paid plan");
  expect(() => assertPromoPlan(DISCOUNT, "monthly")).not.toThrow();
  expect(() =>
    assertPromoPlan({ ...DISCOUNT, eligible_plan: "yearly" }, "monthly"),
  ).toThrow("yearly");
});

test("stores the activation and user audit atomically", async () => {
  await activateSignupPromo(CLIENT, "u1", "FREE30", "free");
  expect(repository.insertActivation).toHaveBeenCalledWith(
    CLIENT,
    "u1",
    FREE_PROMO,
    "free",
  );
  expect(recordRequired).toHaveBeenCalledWith(
    expect.objectContaining({
      actor: { type: "user", id: "u1" },
      action: "signup.promo_activated",
      targetId: "p1",
    }),
    CLIENT,
  );
});

test("does not store an incompatible plan or hide audit failures", async () => {
  await expect(
    activateSignupPromo(CLIENT, "u1", "FREE30", "yearly"),
  ).rejects.toThrow("paid plan");
  expect(repository.insertActivation).not.toHaveBeenCalled();
  jest.mocked(recordRequired).mockRejectedValue(new Error("Audit unavailable"));
  await expect(
    activateSignupPromo(CLIENT, "u1", "FREE30", "free"),
  ).rejects.toThrow("Audit unavailable");
});
