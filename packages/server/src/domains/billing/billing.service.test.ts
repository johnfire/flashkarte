jest.mock("./billing.repository");

import * as repository from "./billing.repository";
import { assertCanCreateUnit, getStatus } from "./billing.service";

const repositoryMock = repository as jest.Mocked<typeof repository>;

beforeEach(() => jest.clearAllMocks());

describe("billing status", () => {
  test("reports the free plan and ten-unit limit", async () => {
    repositoryMock.getBillingStatus.mockResolvedValue({
      account_type: "free",
      active_subscription: null,
      active_unit_count: 3,
    });

    await expect(getStatus("u1")).resolves.toMatchObject({
      plan: "free",
      activeUnitCount: 3,
      activeUnitLimit: 10,
      overLimit: false,
    });
  });

  test("treats a current subscription as unlimited", async () => {
    repositoryMock.getBillingStatus.mockResolvedValue({
      account_type: "free",
      active_subscription: {
        id: "s1",
        user_id: "u1",
        provider: "google_play",
        provider_subscription_id: "purchase-token",
        plan: "monthly",
        status: "active",
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
      },
      active_unit_count: 27,
    });

    await expect(getStatus("u1")).resolves.toMatchObject({
      plan: "paid",
      activeUnitCount: 27,
      activeUnitLimit: null,
      overLimit: false,
    });
  });
});

describe("assertCanCreateUnit", () => {
  test("rejects the eleventh free unit", async () => {
    repositoryMock.getBillingStatus.mockResolvedValue({
      account_type: "free",
      active_subscription: null,
      active_unit_count: 10,
    });

    await expect(assertCanCreateUnit("u1")).rejects.toMatchObject({
      code: "FORBIDDEN",
      context: {
        code: "PLAN_LIMIT_REACHED",
        activeUnitCount: 10,
        activeUnitLimit: 10,
      },
    });
  });

  test("allows existing free users over the limit to continue using content", async () => {
    repositoryMock.getBillingStatus.mockResolvedValue({
      account_type: "free",
      active_subscription: null,
      active_unit_count: 11,
    });

    await expect(getStatus("u1")).resolves.toMatchObject({
      plan: "free",
      overLimit: true,
    });
  });
});
