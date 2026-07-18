import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { DeckWithCounts } from "../api/types";
import "../i18n";
import { DeckListPage } from "./DeckListPage";

vi.mock("../api/client", () => ({
  api: {
    decks: { list: vi.fn(), remove: vi.fn(), setPublic: vi.fn() },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
  reportClientError: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { accountType: "free" },
    logout: vi.fn(),
  }),
}));

const mockedDecksApi = api.decks as unknown as {
  list: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setPublic: ReturnType<typeof vi.fn>;
};

const deck: DeckWithCounts = {
  id: "deck-1",
  title: "German nouns",
  source_filename: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  card_count: 3,
  due_count: 2,
  is_public: false,
  viewed_count: 1,
  new_count: 1,
  again_count: 0,
  hard_count: 0,
  good_count: 1,
  easy_count: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DeckListPage />
    </MemoryRouter>,
  );
}

describe("DeckListPage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders loading and loaded states", async () => {
    mockedDecksApi.list.mockResolvedValue([deck]);
    renderPage();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("German nouns")).toBeInTheDocument();
  });

  test("renders API load failures", async () => {
    mockedDecksApi.list.mockRejectedValue(
      new ApiError(503, "UNAVAILABLE", "Deck service unavailable"),
    );
    renderPage();

    expect(
      await screen.findByText("Deck service unavailable"),
    ).toBeInTheDocument();
  });

  test("deletes a deck and toggles sharing optimistically", async () => {
    mockedDecksApi.list.mockResolvedValue([deck]);
    mockedDecksApi.remove.mockResolvedValue(undefined);
    mockedDecksApi.setPublic.mockReturnValue(new Promise(() => {}));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("German nouns");

    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("button", { name: "Unshare" })).toBeInTheDocument();
    expect(mockedDecksApi.setPublic).toHaveBeenCalledWith("deck-1", true);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("German nouns")).not.toBeInTheDocument(),
    );
    expect(mockedDecksApi.remove).toHaveBeenCalledWith("deck-1");
  });
});
