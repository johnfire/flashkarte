import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { LibraryPage } from "./LibraryPage";

vi.mock("../api/client", () => ({
  api: {
    categories: { tree: vi.fn() },
    library: { list: vi.fn(), clone: vi.fn() },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
}));

const mockedCategories = api.categories as unknown as {
  tree: ReturnType<typeof vi.fn>;
};
const mockedLibraryApi = api.library as unknown as {
  list: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
};

const LANGUAGE_LEARNING = {
  id: "cat-1",
  title: "Language Learning",
  parentId: null,
  officialCount: 0,
  publicCount: 0,
  subcategories: [
    {
      id: "cat-2",
      title: "German",
      parentId: "cat-1",
      officialCount: 0,
      publicCount: 1,
      subcategories: [],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/library"]}>
      <Routes>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/decks/:id/study" element={<p>Study destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCategories.tree.mockResolvedValue({
      categories: [LANGUAGE_LEARNING],
    });
    mockedLibraryApi.list.mockResolvedValue([]);
  });

  test("renders the category tree by default", async () => {
    renderPage();
    expect(await screen.findByText("Language Learning")).toBeInTheDocument();
  });

  test("expanding a subcategory lazily loads its public decks", async () => {
    mockedLibraryApi.list.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === "cat-2"
          ? [
              {
                id: "deck-1",
                title: "World capitals",
                author: "Ada",
                cardCount: 10,
                publishedAt: null,
                categoryId: "cat-2",
              },
            ]
          : [],
      ),
    );
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Language Learning/ }),
    );
    expect(mockedLibraryApi.list).not.toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-2" }),
    );

    await userEvent.click(screen.getByRole("button", { name: /German/ }));

    expect(await screen.findByText("World capitals")).toBeInTheDocument();
  });

  test("search shows flat, cross-category results instead of the tree", async () => {
    renderPage();
    await screen.findByText("Language Learning");

    await userEvent.type(screen.getByRole("textbox"), " geography ");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(mockedLibraryApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "geography" }),
      ),
    );
    expect(screen.queryByText("Language Learning")).not.toBeInTheDocument();
  });

  test("renders a category-tree load failure", async () => {
    mockedCategories.tree.mockRejectedValue(
      new ApiError(500, "FAILED", "Library unavailable"),
    );
    renderPage();
    expect(await screen.findByText("Library unavailable")).toBeInTheDocument();
  });

  test("navigates to the cloned deck", async () => {
    mockedLibraryApi.list.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === "cat-2"
          ? [
              {
                id: "deck-1",
                title: "World capitals",
                author: "Ada",
                cardCount: 10,
                publishedAt: null,
                categoryId: "cat-2",
              },
            ]
          : [],
      ),
    );
    mockedLibraryApi.clone.mockResolvedValue({ id: "owned-deck" });
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Language Learning/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /German/ }));
    await screen.findByText("World capitals");

    await userEvent.click(screen.getByRole("button", { name: "Clone" }));
    expect(await screen.findByText("Study destination")).toBeInTheDocument();
    expect(mockedLibraryApi.clone).toHaveBeenCalledWith("deck-1");
  });
});
