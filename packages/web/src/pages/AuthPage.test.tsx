import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { safeNext } from "./AuthPage";
import { AuthPage } from "./AuthPage";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
}));
const billingMocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  previewPromo: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authMocks,
}));

vi.mock("../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      billing: { ...actual.api.billing, checkout: billingMocks.checkout },
      auth: { ...actual.api.auth, previewPromo: billingMocks.previewPromo },
    },
  };
});

describe("safeNext (open-redirect guard)", () => {
  test("returns a same-origin absolute path unchanged", () => {
    expect(safeNext("/d/spanish-basics")).toBe("/d/spanish-basics");
    expect(safeNext("/library")).toBe("/library");
  });

  test("falls back to / for missing or relative targets", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext("decks")).toBe("/");
  });

  test("rejects protocol-relative and scheme targets (open redirect)", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
});

describe("paid signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.signup.mockResolvedValue(undefined);
    billingMocks.checkout.mockResolvedValue({
      url: "https://checkout.stripe.com/session",
    });
  });

  test("starts the selected paid plan checkout after creating the account", async () => {
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <AuthPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole("radio", { name: /Paid monthly — €5\/month/ }),
    );
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(
      screen.getByLabelText("Password (min 8 chars)"),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(authMocks.signup).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
      ),
    );
    expect(billingMocks.checkout).toHaveBeenCalledWith("monthly");
  });

  test("retries a failed checkout without creating the account again", async () => {
    billingMocks.checkout.mockRejectedValueOnce(
      new Error("Stripe unavailable"),
    );
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <AuthPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("radio", { name: /Paid monthly/ }));
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(
      screen.getByLabelText("Password (min 8 chars)"),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(
      await screen.findByText(
        "Your account is created. Retry checkout to finish your subscription.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Retry checkout" }),
    );
    await waitFor(() => expect(billingMocks.checkout).toHaveBeenCalledTimes(2));
    expect(authMocks.signup).toHaveBeenCalledTimes(1);
  });

  async function fillSignup() {
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(
      screen.getByLabelText("Password (min 8 chars)"),
      "password123",
    );
  }

  test("applies free access without redirecting to payment", async () => {
    billingMocks.previewPromo.mockResolvedValue({
      code: "FREE30",
      kind: "free_access",
      freeDays: 30,
      eligiblePlan: "any",
    });
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <AuthPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("radio", { name: /Paid yearly/ }));
    await userEvent.type(screen.getByLabelText("Promo code"), "free30");
    expect(screen.getByRole("button", { name: "Sign up" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Apply code" }));
    expect(
      await screen.findByText("30 days of free access"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    await fillSignup();
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() =>
      expect(authMocks.signup).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        { promoCode: "FREE30", signupPlan: "free" },
      ),
    );
    expect(billingMocks.checkout).not.toHaveBeenCalled();
  });

  test("selects an eligible paid plan for a discount and starts checkout", async () => {
    billingMocks.previewPromo.mockResolvedValue({
      code: "YEAR20",
      kind: "discount",
      percentOff: 20,
      discountDuration: "once",
      eligiblePlan: "yearly",
    });
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <AuthPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText("Promo code"), "YEAR20");
    await userEvent.click(screen.getByRole("button", { name: "Apply code" }));
    await screen.findByText("20% off · First payment only");
    expect(
      screen.queryByRole("radio", { name: /Paid monthly/ }),
    ).not.toBeInTheDocument();
    await fillSignup();
    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() =>
      expect(authMocks.signup).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        { promoCode: "YEAR20", signupPlan: "yearly" },
      ),
    );
    expect(billingMocks.checkout).toHaveBeenCalledWith("yearly");
  });

  test("rejects an invalid code without creating an account", async () => {
    billingMocks.previewPromo.mockRejectedValue(new Error("unavailable"));
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <AuthPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText("Promo code"), "INVALID");
    await userEvent.click(screen.getByRole("button", { name: "Apply code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not apply",
    );
    expect(screen.getByRole("button", { name: "Sign up" })).toBeDisabled();
    expect(authMocks.signup).not.toHaveBeenCalled();
  });

  test("editing an applied code requires applying the new code", async () => {
    billingMocks.previewPromo.mockResolvedValue({
      code: "FREE30",
      kind: "free_access",
      freeDays: 30,
      eligiblePlan: "any",
    });
    render(
      <MemoryRouter initialEntries={["/login?mode=signup"]}>
        <AuthPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText("Promo code"), "FREE30");
    await userEvent.click(screen.getByRole("button", { name: "Apply code" }));
    await screen.findByText("30 days of free access");
    await userEvent.type(screen.getByLabelText("Promo code"), "X");
    expect(
      screen.queryByText("30 days of free access"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign up" })).toBeDisabled();
  });
});
