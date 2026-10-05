import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api, ApiError } from "../../api/client";
import "../../i18n";
import { PromosSection } from "./PromosSection";

vi.mock("../../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../../api/client")>(
      "../../api/client",
    );
  return {
    ...actual,
    api: {
      ...actual.api,
      admin: {
        ...actual.api.admin,
        listPromos: vi.fn(),
        createPromo: vi.fn(),
        setPromoActive: vi.fn(),
      },
    },
  };
});

const PROMO = {
  id: "promo-1",
  code: "WELCOME20",
  kind: "discount" as const,
  percentOff: 20,
  discountDuration: "once" as const,
  freeDays: null,
  eligiblePlan: "any" as const,
  expiresAt: null,
  maxActivations: 10,
  activationCount: 2,
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.admin.listPromos).mockResolvedValue({ promos: [PROMO] });
  vi.mocked(api.admin.createPromo).mockResolvedValue({ promo: PROMO });
  vi.mocked(api.admin.setPromoActive).mockResolvedValue({
    promo: { ...PROMO, active: false },
  });
});

test("lists promo benefits, deadlines and account activation counts", async () => {
  render(<PromosSection />);
  expect(await screen.findByText("WELCOME20 · Active")).toBeInTheDocument();
  expect(screen.getByText("20% off · First payment only")).toBeInTheDocument();
  expect(screen.getByText("Activations: 2 / 10")).toBeInTheDocument();
  expect(screen.getByText("Signup deadline: No deadline")).toBeInTheDocument();
});

test("creates a normalized discount with limits and plan eligibility", async () => {
  render(<PromosSection />);
  await userEvent.type(screen.getByLabelText("Promo code"), "welcome20");
  await userEvent.type(
    screen.getByLabelText("Maximum activations (optional)"),
    "10",
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Discount duration"),
    "forever",
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Eligible plan"),
    "yearly",
  );
  await userEvent.click(screen.getByRole("button", { name: "Create promo" }));
  await waitFor(() =>
    expect(api.admin.createPromo).toHaveBeenCalledWith({
      code: "WELCOME20",
      kind: "discount",
      percentOff: 20,
      discountDuration: "forever",
      eligiblePlan: "yearly",
      expiresAt: null,
      maxActivations: 10,
    }),
  );
});

test("creates a free-access promo without discount fields", async () => {
  render(<PromosSection />);
  await userEvent.type(screen.getByLabelText("Promo code"), "free30");
  await userEvent.selectOptions(
    screen.getByLabelText("Benefit"),
    "free_access",
  );
  await userEvent.click(screen.getByRole("button", { name: "Create promo" }));
  await waitFor(() =>
    expect(api.admin.createPromo).toHaveBeenCalledWith({
      code: "FREE30",
      kind: "free_access",
      freeDays: 30,
      expiresAt: null,
      maxActivations: null,
    }),
  );
});

test("pauses a code and refreshes the list", async () => {
  render(<PromosSection />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Pause WELCOME20" }),
  );
  await waitFor(() =>
    expect(api.admin.setPromoActive).toHaveBeenCalledWith("promo-1", false),
  );
  await waitFor(() => expect(api.admin.listPromos).toHaveBeenCalledTimes(2));
});

test("keeps the form available when loading fails", async () => {
  vi.mocked(api.admin.listPromos).mockRejectedValue(new Error("unavailable"));
  render(<PromosSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load promos.",
  );
  expect(screen.getByRole("button", { name: "Create promo" })).toBeEnabled();
});

test("shows a creation error without clearing the entered code", async () => {
  vi.mocked(api.admin.createPromo).mockRejectedValue(
    new ApiError(422, "VALIDATION_ERROR", "Code already exists"),
  );
  render(<PromosSection />);
  await userEvent.type(screen.getByLabelText("Promo code"), "welcome20");
  await userEvent.click(screen.getByRole("button", { name: "Create promo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Code already exists",
  );
  expect(screen.getByLabelText("Promo code")).toHaveValue("welcome20");
});
