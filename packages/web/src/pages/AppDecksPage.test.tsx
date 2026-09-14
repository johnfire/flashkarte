import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { AppDecksPage } from "./AppDecksPage";

vi.mock("../api/client", () => ({
  api: {
    categories: {
      tree: vi.fn(),
    },
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

const mockedCategories = api.categories as unknown as {
  tree: ReturnType<typeof vi.fn>;
};
const mockedApi = api.decks as unknown as {
  listCollections: ReturnType<typeof vi.fn>;
  listOfficial: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  subscribeAllInCollection: ReturnType<typeof vi.fn>;
};

const LANGUAGE_LEARNING = {
  id: "cat-1",
  title: "Language Learning",
  parentId: null,
  itemCount: 0,
  subcategories: [
    {
      id: "cat-2",
      title: "German",
      parentId: "cat-1",
      itemCount: 1,
      subcategories: [],
    },
  ],
};

const UNCATEGORIZED = {
  id: "uncategorized",
  title: "Uncategorized",
  parentId: null,
  itemCount: 1,
  subcategories: [],
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
    mockedCategories.tree.mockResolvedValue({
      categories: [LANGUAGE_LEARNING, UNCATEGORIZED],
    });
    mockedApi.listCollections.mockResolvedValue([]);
    mockedApi.listOfficial.mockResolvedValue([]);
  });

  test("renders the category tree, alphabetically as returned by the server", async () => {
    renderPage();
    expect(await screen.findByText("Language Learning")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  test("expanding a subcategory lazily loads its collections and decks", async () => {
    mockedApi.listCollections.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === "cat-2"
          ? [
              {
                id: "col-1",
                title: "German for Arabic Speakers",
                description: null,
                deck_count: 6,
              },
            ]
          : [],
      ),
    );
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Language Learning/ }),
    );
    // Expanding the parent loads its own direct contents, but not the
    // still-collapsed subcategory's.
    expect(mockedApi.listCollections).not.toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-2" }),
    );

    await userEvent.click(screen.getByRole("button", { name: /German/ }));

    expect(
      await screen.findByText("German for Arabic Speakers"),
    ).toBeInTheDocument();
    expect(mockedApi.listCollections).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryId: "cat-2" }),
    );
  });

  test("adding a standalone deck in an expanded category marks it Added", async () => {
    mockedApi.listOfficial.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === "cat-2"
          ? [
              {
                id: "deck-1",
                title: "AI Terms",
                created_at: "x",
                card_count: 50,
                subscribed: false,
              },
            ]
          : [],
      ),
    );
    mockedApi.subscribe.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Language Learning/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /German/ }));
    await screen.findByText("AI Terms");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(mockedApi.subscribe).toHaveBeenCalledWith("deck-1");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Added" })).toBeDisabled(),
    );
  });

  test("Add all on a collection marks it Added all", async () => {
    mockedApi.listCollections.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === "cat-2"
          ? [
              {
                id: "col-1",
                title: "German for Arabic Speakers",
                description: null,
                deck_count: 6,
              },
            ]
          : [],
      ),
    );
    mockedApi.subscribeAllInCollection.mockResolvedValue({ subscribed: 6 });
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Language Learning/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /German/ }));
    await screen.findByText("German for Arabic Speakers");

    await userEvent.click(screen.getByRole("button", { name: "Add all" }));
    expect(mockedApi.subscribeAllInCollection).toHaveBeenCalledWith("col-1");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Added all" })).toBeDisabled(),
    );
  });

  test("search shows flat, cross-category results instead of the tree", async () => {
    renderPage();
    await screen.findByText("Language Learning");

    await userEvent.type(screen.getByRole("textbox"), "cefr");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(mockedApi.listCollections).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "cefr" }),
      ),
    );
    expect(mockedApi.listOfficial).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "cefr" }),
    );
    expect(screen.queryByText("Language Learning")).not.toBeInTheDocument();
  });

  test("renders a category-tree load failure", async () => {
    mockedCategories.tree.mockRejectedValue(
      new ApiError(500, "FAILED", "App decks unavailable"),
    );
    renderPage();
    expect(
      await screen.findByText("App decks unavailable"),
    ).toBeInTheDocument();
  });
});
