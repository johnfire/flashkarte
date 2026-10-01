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
});
