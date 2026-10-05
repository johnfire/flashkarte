import { validatePromo, validateSignupPlan } from "./promo.validation";

const DISCOUNT = {
  code: " welcome-20 ",
  kind: "discount",
  percentOff: 20,
  discountDuration: "once",
  eligiblePlan: "any",
};

test("normalizes codes and supplies optional limits", () => {
  expect(validatePromo(DISCOUNT)).toMatchObject({
    code: "WELCOME-20",
    expiresAt: null,
    maxActivations: null,
  });
});

test.each([0, 101, 2.5, "20"])(
  "rejects invalid percentages: %s",
  (percentOff) => {
    expect(() => validatePromo({ ...DISCOUNT, percentOff })).toThrow();
  },
);

test.each([0, 366, 1.5, "30"])(
  "rejects invalid free-access days: %s",
  (freeDays) => {
    expect(() =>
      validatePromo({ code: "WELCOME", kind: "free_access", freeDays }),
    ).toThrow();
  },
);

test("requires an expiry in the future", () => {
  expect(() =>
    validatePromo({ ...DISCOUNT, expiresAt: "2000-01-01T00:00:00Z" }),
  ).toThrow("future");
  expect(() =>
    validatePromo({ ...DISCOUNT, expiresAt: "not-a-date" }),
  ).toThrow();
});

test("rejects incompatible benefit fields and invalid limits", () => {
  expect(() => validatePromo({ ...DISCOUNT, freeDays: 30 })).toThrow();
  expect(() => validatePromo({ ...DISCOUNT, maxActivations: 0 })).toThrow();
  expect(() => validatePromo({ ...DISCOUNT, code: "a b" })).toThrow();
});

test("accepts free access without Stripe fields", () => {
  expect(
    validatePromo({ code: "FREE30", kind: "free_access", freeDays: 30 }),
  ).toMatchObject({ freeDays: 30 });
});

test("validates signup plans", () => {
  expect(validateSignupPlan(undefined)).toBe("free");
  expect(validateSignupPlan("yearly")).toBe("yearly");
  expect(() => validateSignupPlan("paid")).toThrow();
});
