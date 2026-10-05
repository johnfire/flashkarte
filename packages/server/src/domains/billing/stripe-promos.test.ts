import {
  createPromoCoupon,
  createDiscountCheckoutSession,
  retrieveCheckoutSession,
} from "./stripe.provider";

const originalEnvironment = { ...process.env };
beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "test-only-key";
  process.env.STRIPE_PRICE_MONTHLY = "price-monthly";
  process.env.STRIPE_SUCCESS_URL = "https://learnwohl.example/settings";
  process.env.STRIPE_CANCEL_URL = "https://learnwohl.example/settings";
});
afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...originalEnvironment };
});

test("creates the admin's percentage coupon with a stable request key", async () => {
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "coupon-1" }), { status: 200 }),
    );
  await expect(
    createPromoCoupon("promo-1", {
      code: "WELCOME20",
      kind: "discount",
      percentOff: 20,
      discountDuration: "once",
      eligiblePlan: "any",
      expiresAt: null,
      maxActivations: null,
    }),
  ).resolves.toBe("coupon-1");
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.stripe.com/v1/coupons");
  expect(request?.headers).toMatchObject({
    "Idempotency-Key": "promo-promo-1",
  });
  const parameters = request?.body as URLSearchParams;
  expect(parameters.get("percent_off")).toBe("20");
  expect(parameters.get("duration")).toBe("once");
  expect(parameters.get("name")).toBe("WELCOME20");
});

test("applies only the server-stored coupon to the selected checkout", async () => {
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        id: "session-1",
        url: "https://checkout.stripe.com/session-1",
      }),
      { status: 200 },
    ),
  );
  await createDiscountCheckoutSession(
    "user-1",
    "customer@example.com",
    "monthly",
    "coupon-1",
    "activation-1",
  );
  const parameters = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
  expect(parameters.get("discounts[0][coupon]")).toBe("coupon-1");
  expect(parameters.get("line_items[0][price]")).toBe("price-monthly");
  expect(parameters.get("subscription_data[metadata][userId]")).toBe("user-1");
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
    "Idempotency-Key": "activation-1",
  });
});

test("retrieves and checks checkout completion independently of webhooks", async () => {
  const fetchMock = jest
    .spyOn(global, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ id: "session-1", status: "complete", url: null }),
        { status: 200 },
      ),
    );
  await expect(retrieveCheckoutSession("session-1")).resolves.toMatchObject({
    status: "complete",
  });
  expect(fetchMock.mock.calls[0][0]).toBe(
    "https://api.stripe.com/v1/checkout/sessions/session-1",
  );
});

test("does not accept a failed Stripe response as a created coupon", async () => {
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Stripe unavailable" } }),
        { status: 503 },
      ),
    );
  await expect(
    createPromoCoupon("promo-1", {
      code: "WELCOME20",
      kind: "discount",
      percentOff: 20,
      discountDuration: "forever",
      eligiblePlan: "any",
      expiresAt: null,
      maxActivations: null,
    }),
  ).rejects.toThrow("Stripe unavailable");
});
