import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { AppDecksCollectionPage } from "./AppDecksCollectionPage";

vi.mock("../api/client", () => ({
  api: {
    decks: {
      getCollection: vi.fn(),
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
  getCollection: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  subscribeAllInCollection: ReturnType<typeof vi.fn>;
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/app-decks/col-1"]}>
      <Routes>
        <Route path="/app-decks" element={<p>App Decks page</p>} />
        <Route path="/app-decks/:id" element={<AppDecksCollectionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const collection = {
  id: "col-1",
  title: "German for Arabic Speakers",
  description: "CEFR A1-B1 vocabulary",
  decks: [
    {
      id: "deck-1",
      title: "A1.0",
      created_at: "x",
      card_count: 500,
      subscribed: false,
    },
    {
      id: "deck-2",
      title: "A1.1",
      created_at: "x",
      card_count: 500,
      subscribed: true,
    },
  ],
};

describe("AppDecksCollectionPage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders the collection title, description, and its decks", async () => {
    mockedApi.getCollection.mockResolvedValue(collection);
    renderPage();

    expect(
      await screen.findByText("German for Arabic Speakers"),
    ).toBeInTheDocument();
    expect(screen.getByText("CEFR A1-B1 vocabulary")).toBeInTheDocument();
    expect(screen.getByText("A1.0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Added" })).toBeDisabled();
  });

  test("adding one deck marks only that deck Added", async () => {
    mockedApi.getCollection.mockResolvedValue(collection);
    mockedApi.subscribe.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("A1.0");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(mockedApi.subscribe).toHaveBeenCalledWith("deck-1");
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Added" })).toHaveLength(2),
    );
  });

  test("Add all subscribes to the whole collection", async () => {
    mockedApi.getCollection.mockResolvedValue(collection);
    mockedApi.subscribeAllInCollection.mockResolvedValue({ subscribed: 2 });
    renderPage();
    await screen.findByText("A1.0");

    await userEvent.click(screen.getByRole("button", { name: "Add all" }));
    expect(mockedApi.subscribeAllInCollection).toHaveBeenCalledWith("col-1");
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Added" })).toHaveLength(2),
    );
  });

  test("renders load failures", async () => {
    mockedApi.getCollection.mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Collection not found"),
    );
    renderPage();
    expect(await screen.findByText("Collection not found")).toBeInTheDocument();
  });
});
