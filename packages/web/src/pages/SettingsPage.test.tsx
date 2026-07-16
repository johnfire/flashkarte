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
      exportData: vi.fn(),
      twoFactorSetup: vi.fn(),
      twoFactorEnable: vi.fn(),
      twoFactorDisable: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
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
    exportData: ReturnType<typeof vi.fn>;
    twoFactorSetup: ReturnType<typeof vi.fn>;
    twoFactorEnable: ReturnType<typeof vi.fn>;
    twoFactorDisable: ReturnType<typeof vi.fn>;
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

  describe("TwoFactorSection", () => {
    test("enable flow: QR shown, code verified, backup codes displayed once", async () => {
      mockUser = { displayName: null, accountType: "free" };
      mockApi.keys.list.mockResolvedValue([]);
      mockApi.auth.twoFactorSetup.mockResolvedValue({
        otpauthUri: "otpauth://totp/Flashkarte:a%40b.c?secret=X",
        qrDataUrl: "data:image/png;base64,QR",
      });
      mockApi.auth.twoFactorEnable.mockResolvedValue({
        backupCodes: ["aaaaa-11111", "bbbbb-22222"],
      });

      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: /Enable 2FA/ }),
      );

      // QR pairing step
      const qr = await screen.findByAltText(/QR code/);
      expect(qr).toHaveAttribute("src", "data:image/png;base64,QR");

      await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
      await userEvent.click(
        screen.getByRole("button", { name: /Verify & enable/ }),
      );

      await waitFor(() =>
        expect(mockApi.auth.twoFactorEnable).toHaveBeenCalledWith("123456"),
      );
      // one-time backup codes visible
      expect(await screen.findByText("aaaaa-11111")).toBeInTheDocument();
      expect(screen.getByText(/will not be shown again/)).toBeInTheDocument();
    });

    test("wrong code shows the server error and does not enable", async () => {
      mockUser = { displayName: null, accountType: "free" };
      mockApi.keys.list.mockResolvedValue([]);
      mockApi.auth.twoFactorSetup.mockResolvedValue({
        otpauthUri: "otpauth://x",
        qrDataUrl: "data:image/png;base64,QR",
      });
      const { ApiError } = await import("../api/client");
      mockApi.auth.twoFactorEnable.mockRejectedValue(
        new ApiError(422, "VALIDATION", "Invalid verification code"),
      );

      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: /Enable 2FA/ }),
      );
      await userEvent.type(
        await screen.findByLabelText("6-digit code"),
        "000000",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Verify & enable/ }),
      );

      expect(
        await screen.findByText("Invalid verification code"),
      ).toBeInTheDocument();
    });
  });

  describe("DataExportSection", () => {
    test("downloads the export as a JSON file", async () => {
      mockUser = { displayName: null, accountType: "free" };
      mockApi.keys.list.mockResolvedValue([]);
      mockApi.auth.exportData.mockResolvedValue({ profile: {} });

      // jsdom has no createObjectURL; stub the blob-download plumbing.
      const objectUrl = vi.fn(() => "blob:mock");
      const revoke = vi.fn();
      globalThis.URL.createObjectURL = objectUrl;
      globalThis.URL.revokeObjectURL = revoke;
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});

      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: /Download my data/ }),
      );

      await waitFor(() => expect(mockApi.auth.exportData).toHaveBeenCalled());
      expect(objectUrl).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(revoke).toHaveBeenCalledWith("blob:mock");
      click.mockRestore();
    });
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

      expect(screen.getByText(/Type DELETE to confirm/)).toBeInTheDocument();

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

      const modal = screen.getByText("Delete your account?").closest(".fixed")!;

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
