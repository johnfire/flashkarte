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

const TREE = {
  categories: [
    {
      id: "cat-1",
      title: "Language Learning",
      parentId: null,
      itemCount: 0,
      subcategories: [
        {
          id: "cat-2",
          title: "German",
          parentId: "cat-1",
          itemCount: 0,
          subcategories: [],
        },
      ],
    },
    {
      id: "uncategorized",
      title: "Uncategorized",
      parentId: null,
      itemCount: 1,
      subcategories: [],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedAdmin.categoryTree.mockResolvedValue(TREE);
  mockedDecks.listOfficial.mockResolvedValue([]);
  mockedDecks.listCollections.mockResolvedValue([]);
});

describe("CategoriesSection", () => {
  test("renders the tree, excluding the synthetic Uncategorized node from management", async () => {
    render(<CategoriesSection />);
    expect(await screen.findByText("Language Learning")).toBeInTheDocument();
    expect(screen.getByText("German")).toBeInTheDocument();
    // "Uncategorized" is only offered by the assignment dropdown as "None",
    // not as a manageable tree row.
    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
  });

  test("creates a top-level category", async () => {
    mockedAdmin.createCategory.mockResolvedValue({
      category: { id: "cat-3", title: "AI", parentId: null },
    });
    render(<CategoriesSection />);
    await screen.findByText("Language Learning");

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
    const row = (await screen.findByText("Language Learning")).closest(
      "div.flex",
    ) as HTMLElement;
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
    const row = (await screen.findByText("Language Learning")).closest(
      "div.flex",
    ) as HTMLElement;
    await userEvent.click(within(row).getByText("Delete"));

    expect(
      await screen.findByText(
        "Move or delete its subcategories before deleting this category",
      ),
    ).toBeInTheDocument();
  });

  test("assigning a category to a found deck calls setDeckCategory", async () => {
    mockedDecks.listOfficial.mockResolvedValue([
      {
        id: "deck-1",
        title: "AI Terms",
        created_at: "x",
        card_count: 1,
        subscribed: false,
        category_id: null,
      },
    ]);
    mockedAdmin.setDeckCategory.mockResolvedValue(undefined);
    render(<CategoriesSection />);
    await screen.findByText("Language Learning");

    await userEvent.type(
      screen.getByPlaceholderText("Search official decks and collections…"),
      "AI",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("AI Terms");

    await userEvent.selectOptions(screen.getByRole("combobox"), "cat-2");
    await waitFor(() =>
      expect(mockedAdmin.setDeckCategory).toHaveBeenCalledWith(
        "deck-1",
        "cat-2",
      ),
    );
  });
});
