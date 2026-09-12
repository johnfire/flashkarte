import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { AppDecksPage } from "./AppDecksPage";

vi.mock("../api/client", () => ({
  api: {
    decks: {
      listCollections: vi.fn(),
      listOfficial: vi.fn(),
      subscribe: vi.fn(),
      subscribeAllInCollection: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
  reportClientError: vi.fn(),
}));

const mockedApi = api.decks as unknown as {
  listCollections: ReturnType<typeof vi.fn>;
  listOfficial: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  subscribeAllInCollection: ReturnType<typeof vi.fn>;
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app-decks"]}>
      <Routes>
        <Route path="/app-decks" element={<AppDecksPage />} />
        <Route path="/app-decks/:id" element={<p>Collection page</p>} />
        <Route path="/" element={<p>My Decks page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppDecksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listCollections.mockResolvedValue([]);
    mockedApi.listOfficial.mockResolvedValue([]);
  });

  test("renders collections and standalone decks", async () => {
    mockedApi.listCollections.mockResolvedValue([
      {
        id: "col-1",
        title: "German for Arabic Speakers",
        description: null,
        deck_count: 6,
      },
    ]);
    mockedApi.listOfficial.mockResolvedValue([
      {
        id: "deck-1",
        title: "AI Terms",
        created_at: "x",
        card_count: 50,
        subscribed: false,
      },
    ]);
    renderPage();

    expect(
      await screen.findByText("German for Arabic Speakers"),
    ).toBeInTheDocument();
    expect(screen.getByText("6 decks")).toBeInTheDocument();
    expect(screen.getByText("AI Terms")).toBeInTheDocument();
  });

  test("adding a standalone deck marks it Added", async () => {
    mockedApi.listOfficial.mockResolvedValue([
      {
        id: "deck-1",
        title: "AI Terms",
        created_at: "x",
        card_count: 50,
        subscribed: false,
      },
    ]);
    mockedApi.subscribe.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("AI Terms");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(mockedApi.subscribe).toHaveBeenCalledWith("deck-1");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Added" })).toBeDisabled(),
    );
  });

  test("Add all on a collection marks it Added all", async () => {
    mockedApi.listCollections.mockResolvedValue([
      {
        id: "col-1",
        title: "German for Arabic Speakers",
        description: null,
        deck_count: 6,
      },
    ]);
    mockedApi.subscribeAllInCollection.mockResolvedValue({ subscribed: 6 });
    renderPage();
    await screen.findByText("German for Arabic Speakers");

    await userEvent.click(screen.getByRole("button", { name: "Add all" }));
    expect(mockedApi.subscribeAllInCollection).toHaveBeenCalledWith("col-1");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Added all" })).toBeDisabled(),
    );
  });

  test("search filters both sections", async () => {
    renderPage();
    await screen.findByText("No collections match your search.");

    await userEvent.type(screen.getByRole("textbox"), "cefr");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(mockedApi.listCollections).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "cefr" }),
    );
    expect(mockedApi.listOfficial).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "cefr" }),
    );
  });

  test("renders load failures", async () => {
    mockedApi.listCollections.mockRejectedValue(
      new ApiError(500, "FAILED", "App decks unavailable"),
    );
    renderPage();
    expect(
      await screen.findByText("App decks unavailable"),
    ).toBeInTheDocument();
  });
});
