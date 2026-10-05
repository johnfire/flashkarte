jest.mock("../../db/client");
jest.mock("./promo.repository");
jest.mock("../billing/stripe.provider");
jest.mock("../audit/audit.service");
import type { PoolClient } from "pg";
import { withTransaction } from "../../db/client";
import * as repository from "./promo.repository";
import * as stripe from "../billing/stripe.provider";
import { createSignupDiscountCheckout } from "./promo-checkout.service";

const CLIENT = {} as PoolClient;
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(withTransaction).mockImplementation(async (work) => work(CLIENT));
  jest.mocked(repository.findSignupDiscount).mockResolvedValue("coupon-1");
  jest.mocked(repository.lockSignupDiscount).mockResolvedValue({
    stripe_coupon_id: "coupon-1",
    stripe_checkout_id: null,
  });
  jest.mocked(stripe.createDiscountCheckoutSession).mockResolvedValue({
    id: "session-1",
    url: "https://checkout.stripe.com/session-1",
  });
});

test("skips discounts for accounts without a signup activation", async () => {
  jest.mocked(repository.findSignupDiscount).mockResolvedValue(undefined);
  await expect(
    createSignupDiscountCheckout("u1", "customer@example.com", "monthly"),
  ).resolves.toBeNull();
  expect(withTransaction).not.toHaveBeenCalled();
});

test("creates and saves one checkout while holding the activation lock", async () => {
  await expect(
    createSignupDiscountCheckout("u1", "customer@example.com", "monthly"),
  ).resolves.toContain("session-1");
  expect(repository.lockSignupDiscount).toHaveBeenCalledWith(
    CLIENT,
    "u1",
    "monthly",
  );
  expect(stripe.createDiscountCheckoutSession).toHaveBeenCalledWith(
    "u1",
    "customer@example.com",
    "monthly",
    "coupon-1",
    "signup-promo-u1-first",
  );
  expect(repository.storeCheckout).toHaveBeenCalledWith(
    CLIENT,
    "u1",
    "session-1",
  );
});

test("returns the pending checkout when the customer retries", async () => {
  jest.mocked(repository.lockSignupDiscount).mockResolvedValue({
    stripe_coupon_id: "coupon-1",
    stripe_checkout_id: "existing",
  });
  jest.mocked(stripe.retrieveCheckoutSession).mockResolvedValue({
    id: "existing",
    status: "open",
    url: "https://checkout.stripe.com/existing",
  });
  await expect(
    createSignupDiscountCheckout("u1", "customer@example.com", "monthly"),
  ).resolves.toContain("existing");
  expect(stripe.createDiscountCheckoutSession).not.toHaveBeenCalled();
});

test("replaces only an expired checkout with a new idempotency key", async () => {
  jest.mocked(repository.lockSignupDiscount).mockResolvedValue({
    stripe_coupon_id: "coupon-1",
    stripe_checkout_id: "expired",
  });
  jest
    .mocked(stripe.retrieveCheckoutSession)
    .mockResolvedValue({ id: "expired", status: "expired", url: null });
  await createSignupDiscountCheckout("u1", "customer@example.com", "monthly");
  expect(stripe.createDiscountCheckoutSession).toHaveBeenCalledWith(
    "u1",
    "customer@example.com",
    "monthly",
    "coupon-1",
    "signup-promo-u1-expired",
  );
});

test("rejects a completed checkout even before the subscription webhook arrives", async () => {
  jest.mocked(repository.lockSignupDiscount).mockResolvedValue({
    stripe_coupon_id: "coupon-1",
    stripe_checkout_id: "complete",
  });
  jest
    .mocked(stripe.retrieveCheckoutSession)
    .mockResolvedValue({ id: "complete", status: "complete", url: null });
  await expect(
    createSignupDiscountCheckout("u1", "customer@example.com", "monthly"),
  ).rejects.toThrow("already been used");
  expect(stripe.createDiscountCheckoutSession).not.toHaveBeenCalled();
});

test("propagates Stripe failures without saving a successful checkout", async () => {
  jest
    .mocked(stripe.createDiscountCheckoutSession)
    .mockRejectedValue(new Error("Stripe unavailable"));
  await expect(
    createSignupDiscountCheckout("u1", "customer@example.com", "monthly"),
  ).rejects.toThrow("Stripe unavailable");
  expect(repository.storeCheckout).not.toHaveBeenCalled();
});
