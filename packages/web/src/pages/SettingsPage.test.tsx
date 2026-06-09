import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "../i18n";
import { SettingsPage } from "./SettingsPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { keys: { list: vi.fn(), create: vi.fn(), revoke: vi.fn() } },
  ApiError: class ApiError extends Error {},
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

const mockApi = api as unknown as {
  keys: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
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
  beforeEach(() => vi.clearAllMocks());

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
});
