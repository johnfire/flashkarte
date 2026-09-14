import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../../api/client";
import "../../i18n";
import { CategoriesSection } from "./CategoriesSection";

vi.mock("../../api/client", () => ({
  api: {
    admin: {
      categoryTree: vi.fn(),
      createCategory: vi.fn(),
      renameCategory: vi.fn(),
      deleteCategory: vi.fn(),
      setDeckCategory: vi.fn(),
      setCollectionCategory: vi.fn(),
    },
    decks: {
      listOfficial: vi.fn(),
      listCollections: vi.fn(),
    },
    library: {
      list: vi.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
}));

const mockedAdmin = api.admin as unknown as {
  categoryTree: ReturnType<typeof vi.fn>;
  createCategory: ReturnType<typeof vi.fn>;
  renameCategory: ReturnType<typeof vi.fn>;
  deleteCategory: ReturnType<typeof vi.fn>;
  setDeckCategory: ReturnType<typeof vi.fn>;
  setCollectionCategory: ReturnType<typeof vi.fn>;
};
const mockedDecks = api.decks as unknown as {
  listOfficial: ReturnType<typeof vi.fn>;
  listCollections: ReturnType<typeof vi.fn>;
};
const mockedLibrary = api.library as unknown as {
  list: ReturnType<typeof vi.fn>;
};

const TREE = {
  categories: [
    {
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
          publicCount: 0,
          subcategories: [],
        },
      ],
    },
    {
      id: "uncategorized",
      title: "Uncategorized",
      parentId: null,
      officialCount: 1,
      publicCount: 0,
      subcategories: [],
    },
  ],
};

/** Every UncategorizedList in the Quick Categorize panel calls these three
 * with `categoryId: "uncategorized"` on mount; the search-driven Assign
 * panel calls them without a categoryId. Tests differentiate on that. */
function onlyForUncategorizedQuery<T>(items: T[]) {
  return (params?: { categoryId?: string }) =>
    Promise.resolve(params?.categoryId === "uncategorized" ? items : []);
}

function panelByHeading(text: string): HTMLElement {
  return screen.getByText(text).closest("div") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAdmin.categoryTree.mockResolvedValue(TREE);
  mockedDecks.listOfficial.mockResolvedValue([]);
  mockedDecks.listCollections.mockResolvedValue([]);
  mockedLibrary.list.mockResolvedValue([]);
});

describe("CategoriesSection: tree management", () => {
  test("renders the tree, excluding the synthetic Uncategorized node from management", async () => {
    render(<CategoriesSection />);
    await screen.findByText("Categories");
    const panel = panelByHeading("Categories");
    expect(within(panel).getByText("Language Learning")).toBeInTheDocument();
    expect(within(panel).getByText("German")).toBeInTheDocument();
    // "Uncategorized" is only offered by the assignment dropdown as "None",
    // not as a manageable tree row.
    expect(within(panel).queryByText("Uncategorized")).not.toBeInTheDocument();
  });

  test("creates a top-level category", async () => {
    mockedAdmin.createCategory.mockResolvedValue({
      category: { id: "cat-3", title: "AI", parentId: null },
    });
    render(<CategoriesSection />);
    await screen.findByText("Categories");

    const forms = screen.getAllByPlaceholderText("New category name");
    await userEvent.type(forms[forms.length - 1], "AI");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Add category" }).slice(-1)[0],
    );

    expect(mockedAdmin.createCategory).toHaveBeenCalledWith("AI", undefined);
    expect(mockedAdmin.categoryTree).toHaveBeenCalledTimes(2); // initial + reload
  });

  test("renaming a category calls the API and reloads", async () => {
    mockedAdmin.renameCategory.mockResolvedValue({
      category: { id: "cat-1", title: "Languages", parentId: null },
    });
    render(<CategoriesSection />);
    await screen.findByText("Categories");
    const panel = panelByHeading("Categories");
    const row = within(panel)
      .getByText("Language Learning")
      .closest("div.flex") as HTMLElement;
    await userEvent.click(within(row).getByText("Rename"));
    const input = screen.getByDisplayValue("Language Learning");
    await userEvent.clear(input);
    await userEvent.type(input, "Languages");
    await userEvent.click(screen.getByText("Save"));

    expect(mockedAdmin.renameCategory).toHaveBeenCalledWith(
      "cat-1",
      "Languages",
    );
  });

  test("deleting a category blocked by subcategories shows the server's error", async () => {
    mockedAdmin.deleteCategory.mockRejectedValue(
      new ApiError(
        409,
        "CONFLICT",
        "Move or delete its subcategories before deleting this category",
      ),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CategoriesSection />);
    await screen.findByText("Categories");
    const panel = panelByHeading("Categories");
    const row = within(panel)
      .getByText("Language Learning")
      .closest("div.flex") as HTMLElement;
    await userEvent.click(within(row).getByText("Delete"));

    expect(
      await screen.findByText(
        "Move or delete its subcategories before deleting this category",
      ),
    ).toBeInTheDocument();
  });
});

describe("CategoriesSection: quick categorize", () => {
  test("clicking an item is disabled until a target category is chosen", async () => {
    mockedDecks.listOfficial.mockImplementation(
      onlyForUncategorizedQuery([
        {
          id: "deck-1",
          title: "AI Terms",
          created_at: "x",
          card_count: 1,
          subscribed: false,
          category_id: null,
        },
      ]),
    );
    render(<CategoriesSection />);
    await screen.findByText("Categories");
    const quickPanel = panelByHeading("Quick categorize");
    const button = (await within(quickPanel).findByText("AI Terms")).closest(
      "button",
    ) as HTMLElement;
    expect(button).toBeDisabled();
  });

  test("selecting a target then clicking an uncategorized deck assigns it and removes it from the list", async () => {
    mockedDecks.listOfficial.mockImplementation(
      onlyForUncategorizedQuery([
        {
          id: "deck-1",
          title: "AI Terms",
          created_at: "x",
          card_count: 1,
          subscribed: false,
          category_id: null,
        },
      ]),
    );
    mockedAdmin.setDeckCategory.mockResolvedValue(undefined);
    render(<CategoriesSection />);
    await screen.findByText("Categories");
    const quickPanel = panelByHeading("Quick categorize");

    await userEvent.selectOptions(
      within(quickPanel).getByRole("combobox"),
      "cat-1",
    );
    await userEvent.click(within(quickPanel).getByText("AI Terms"));

    expect(mockedAdmin.setDeckCategory).toHaveBeenCalledWith("deck-1", "cat-1");
    await waitFor(() =>
      expect(
        within(quickPanel).queryByText("AI Terms"),
      ).not.toBeInTheDocument(),
    );
  });

  test("shows an all-caught-up message once every uncategorized list is empty", async () => {
    render(<CategoriesSection />);
    await screen.findByText("Categories");
    const quickPanel = panelByHeading("Quick categorize");
    await waitFor(() =>
      expect(within(quickPanel).getByText(/caught up/i)).toBeInTheDocument(),
    );
  });
});

describe("CategoriesSection: search-driven assignment", () => {
  test("assigning a category to a found deck calls setDeckCategory", async () => {
    mockedDecks.listOfficial.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === undefined
          ? [
              {
                id: "deck-1",
                title: "AI Terms",
                created_at: "x",
                card_count: 1,
                subscribed: false,
                category_id: null,
              },
            ]
          : [],
      ),
    );
    mockedAdmin.setDeckCategory.mockResolvedValue(undefined);
    render(<CategoriesSection />);
    await screen.findByText("Categories");

    await userEvent.type(
      screen.getByPlaceholderText("Search official decks and collections…"),
      "AI",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    const row = (await screen.findByText("AI Terms")).closest(
      "li",
    ) as HTMLElement;

    await userEvent.selectOptions(within(row).getByRole("combobox"), "cat-2");
    await waitFor(() =>
      expect(mockedAdmin.setDeckCategory).toHaveBeenCalledWith(
        "deck-1",
        "cat-2",
      ),
    );
  });

  test("assigning a category to a found Library deck also calls setDeckCategory", async () => {
    mockedLibrary.list.mockImplementation((params) =>
      Promise.resolve(
        params?.categoryId === undefined
          ? [
              {
                id: "pub-1",
                title: "Kanji Basics",
                author: "Chris",
                cardCount: 20,
                publishedAt: "2026-01-01T00:00:00.000Z",
                categoryId: null,
              },
            ]
          : [],
      ),
    );
    mockedAdmin.setDeckCategory.mockResolvedValue(undefined);
    render(<CategoriesSection />);
    await screen.findByText("Categories");

    await userEvent.type(
      screen.getByPlaceholderText("Search official decks and collections…"),
      "Kanji",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    const row = (await screen.findByText("Kanji Basics")).closest(
      "li",
    ) as HTMLElement;

    await userEvent.selectOptions(within(row).getByRole("combobox"), "cat-1");
    await waitFor(() =>
      expect(mockedAdmin.setDeckCategory).toHaveBeenCalledWith(
        "pub-1",
        "cat-1",
      ),
    );
  });
});
