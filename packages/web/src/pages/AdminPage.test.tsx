import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { AdminUser } from "../api/types";
import "../i18n";
import { AdminPage } from "./AdminPage";

vi.mock("../api/client", () => ({
  api: {
    admin: {
      listUsers: vi.fn(),
      createUser: vi.fn(),
      setAccountType: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
}));

const mockedAdminApi = api.admin as unknown as {
  listUsers: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
  setAccountType: ReturnType<typeof vi.fn>;
};

const adminUser: AdminUser = {
  id: "user-1",
  email: "new@example.com",
  role: "user",
  accountType: "free",
  emailVerifiedAt: "2026-01-01",
  createdAt: "2026-01-01",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
}

describe("AdminPage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders loading and loaded states", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [adminUser] });
    renderPage();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
  });

  test("renders API load failures", async () => {
    mockedAdminApi.listUsers.mockRejectedValue(
      new ApiError(500, "FAILED", "Admin service unavailable"),
    );
    renderPage();

    expect(
      await screen.findByText("Admin service unavailable"),
    ).toBeInTheDocument();
  });

  test("prepends a created user and changes its account type", async () => {
    mockedAdminApi.listUsers.mockResolvedValue({ users: [] });
    mockedAdminApi.createUser.mockResolvedValue({ user: adminUser });
    mockedAdminApi.setAccountType.mockResolvedValue({ user: adminUser });
    renderPage();
    await screen.findByText("Users (0)");

    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(
      screen.getByLabelText("Initial password (8+ chars)"),
      "password123",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
    expect(mockedAdminApi.createUser).toHaveBeenCalledWith(
      "new@example.com",
      "password123",
      "free",
    );

    const accountTypeSelect = screen.getAllByRole("combobox")[1];
    await userEvent.selectOptions(accountTypeSelect, "paid");
    expect(mockedAdminApi.setAccountType).toHaveBeenCalledWith(
      "user-1",
      "paid",
    );
    expect(accountTypeSelect).toHaveValue("paid");
  });
});
