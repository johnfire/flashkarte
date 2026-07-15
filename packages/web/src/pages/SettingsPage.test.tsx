import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "../i18n";
import { SettingsPage } from "./SettingsPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    keys: { list: vi.fn(), create: vi.fn(), revoke: vi.fn() },
    auth: {
      changePassword: vi.fn(),
      updateProfile: vi.fn(),
      deleteAccount: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {},
}));

// Mutable so individual tests can render logged-out or logged-in.
let mockUser: { displayName: string | null; accountType: string } | null = null;
const updateUser = vi.fn();
const mockLogout = vi.fn();
vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, updateUser, logout: mockLogout }),
}));

const mockApi = api as unknown as {
  keys: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };
  auth: {
    changePassword: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  test("generating a key shows the raw value once", async () => {
    mockApi.keys.list.mockResolvedValue([]);
    mockApi.keys.create.mockResolvedValue({
      key: "fk_supersecretrawkey",
      name: "My AI",
      key_prefix: "fk_supersec",
      created_at: new Date(0).toISOString(),
    });

    renderPage();
    await waitFor(() => expect(mockApi.keys.list).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /Generate key/ }));

    expect(await screen.findByText("fk_supersecretrawkey")).toBeInTheDocument();
    expect(screen.getByText(/won't be shown again/)).toBeInTheDocument();
    expect(mockApi.keys.create).toHaveBeenCalledWith("My AI");
  });

  test("shows the MCP server URL to connect an AI client", async () => {
    mockApi.keys.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/\/mcp$/)).toBeInTheDocument();
  });

  test("shows the configured MCP connect URL", async () => {
    mockApi.keys.list.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(/mcp\.flashkarte\.christopherrehm\.de\/mcp/),
    ).toBeInTheDocument();
  });

  test("changing password submits current + new and confirms", async () => {
    mockUser = { displayName: null, accountType: "free" };
    mockApi.keys.list.mockResolvedValue([]);
    mockApi.auth.changePassword.mockResolvedValue({
      user: { displayName: null, accountType: "free" },
      accessToken: "newtok",
    });

    renderPage();

    await userEvent.type(
      screen.getByLabelText("Current password"),
      "OldPassw0rd",
    );
    await userEvent.type(
      screen.getByLabelText("New password (min 8 chars)"),
      "BrandNewPassw0rd",
    );
    await userEvent.type(
      screen.getByLabelText("Confirm new password"),
      "BrandNewPassw0rd",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Update password/ }),
    );

    await waitFor(() =>
      expect(mockApi.auth.changePassword).toHaveBeenCalledWith(
        "OldPassw0rd",
        "BrandNewPassw0rd",
      ),
    );
    expect(await screen.findByText("Password updated.")).toBeInTheDocument();
  });

  test("mismatched new passwords are rejected client-side", async () => {
    mockUser = { displayName: null, accountType: "free" };
    mockApi.keys.list.mockResolvedValue([]);

    renderPage();

    await userEvent.type(
      screen.getByLabelText("Current password"),
      "OldPassw0rd",
    );
    await userEvent.type(
      screen.getByLabelText("New password (min 8 chars)"),
      "BrandNewPassw0rd",
    );
    await userEvent.type(
      screen.getByLabelText("Confirm new password"),
      "Different0ne",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Update password/ }),
    );

    expect(
      await screen.findByText("The new passwords don't match."),
    ).toBeInTheDocument();
    expect(mockApi.auth.changePassword).not.toHaveBeenCalled();
  });

  describe("DangerZoneSection", () => {
    test("shows the delete button", async () => {
      mockUser = { displayName: null, accountType: "free" };
      mockApi.keys.list.mockResolvedValue([]);

      renderPage();
      expect(
        await screen.findByRole("button", { name: /Delete account/ }),
      ).toBeInTheDocument();
    });

    test("opens modal on click and requires DELETE confirmation", async () => {
      mockUser = { displayName: null, accountType: "free" };
      mockApi.keys.list.mockResolvedValue([]);

      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: /Delete account/ }),
      );

      expect(
        screen.getByText(/Type DELETE to confirm/),
      ).toBeInTheDocument();

      // Submit without typing DELETE should show error
      await userEvent.click(
        screen.getByRole("button", { name: /Delete my account/ }),
      );
      expect(
        await screen.findByText(/Type DELETE in the confirmation field/),
      ).toBeInTheDocument();
    });

    test("deletes account on valid password + DELETE confirmation", async () => {
      mockUser = { displayName: null, accountType: "free" };
      mockApi.keys.list.mockResolvedValue([]);
      mockApi.auth.deleteAccount.mockResolvedValue(undefined);

      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: /Delete account/ }),
      );

      const modal = screen
        .getByText("Delete your account?")
        .closest(".fixed")!;

      await userEvent.type(
        within(modal as HTMLElement).getByLabelText("Current password"),
        "password123",
      );
      await userEvent.type(
        within(modal as HTMLElement).getByLabelText("Type DELETE to confirm"),
        "DELETE",
      );
      await userEvent.click(
        within(modal as HTMLElement).getByRole("button", {
          name: /Delete my account/,
        }),
      );

      await waitFor(() =>
        expect(mockApi.auth.deleteAccount).toHaveBeenCalledWith("password123"),
      );
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
