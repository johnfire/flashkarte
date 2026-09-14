jest.mock("./categories.repository");

import * as repo from "./categories.repository";
import { create, update, remove, getTree } from "./categories.service";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../../utils/errors";

const mockedRepo = repo as jest.Mocked<typeof repo>;

const TOP_LEVEL = {
  id: "cat-1",
  title: "Language Learning",
  parent_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const SUB = {
  id: "cat-2",
  title: "German",
  parent_id: "cat-1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const OTHER_TOP_LEVEL = {
  id: "cat-3",
  title: "AI",
  parent_id: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("create", () => {
  test("rejects a blank title", async () => {
    await expect(create("   ", undefined)).rejects.toThrow(
      "title must not be blank",
    );
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  test("creates a top-level category when parentId is omitted", async () => {
    mockedRepo.findByTitleAndParent.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue(TOP_LEVEL as never);
    const category = await create("Language Learning", undefined);
    expect(mockedRepo.create).toHaveBeenCalledWith("Language Learning", null);
    expect(category.parentId).toBeNull();
  });

  test("rejects a duplicate title at the same level", async () => {
    mockedRepo.findByTitleAndParent.mockResolvedValue({ id: "existing" });
    await expect(create("Language Learning", undefined)).rejects.toThrow(
      "A category with this title already exists",
    );
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  test("rejects a parent that is itself a subcategory", async () => {
    mockedRepo.getById.mockResolvedValue(SUB as never);
    await expect(create("Bavarian", "cat-2")).rejects.toThrow(
      "categories can only be nested two levels deep",
    );
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  test("404s when the named parent doesn't exist", async () => {
    mockedRepo.getById.mockResolvedValue(null);
    await expect(create("German", "missing")).rejects.toThrow(NotFoundError);
  });

  test("creates a subcategory under a valid top-level parent", async () => {
    mockedRepo.getById.mockResolvedValue(TOP_LEVEL as never);
    mockedRepo.findByTitleAndParent.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue(SUB as never);
    const category = await create("German", "cat-1");
    expect(mockedRepo.create).toHaveBeenCalledWith("German", "cat-1");
    expect(category.parentId).toBe("cat-1");
  });
});

describe("update", () => {
  test("404s when the category doesn't exist", async () => {
    mockedRepo.getById.mockResolvedValue(null);
    await expect(update("missing", "New title", undefined)).rejects.toThrow(
      NotFoundError,
    );
  });

  test("rejects a category becoming its own parent", async () => {
    mockedRepo.getById.mockResolvedValue(TOP_LEVEL as never);
    await expect(update("cat-1", undefined, "cat-1")).rejects.toThrow(
      "A category cannot be its own parent",
    );
  });

  test("rejects reparenting a category that already has subcategories", async () => {
    // "cat-1" (current) already has "German" under it; trying to move it
    // under another top-level category ("cat-3") should be rejected.
    mockedRepo.getById
      .mockResolvedValueOnce(TOP_LEVEL as never) // current: cat-1
      .mockResolvedValueOnce(OTHER_TOP_LEVEL as never); // named new parent: cat-3
    mockedRepo.hasSubcategories.mockResolvedValue(true);
    await expect(update("cat-1", undefined, "cat-3")).rejects.toThrow(
      "A category with subcategories cannot itself become a subcategory",
    );
  });

  test("renames within the same level", async () => {
    mockedRepo.getById.mockResolvedValue(TOP_LEVEL as never);
    mockedRepo.findByTitleAndParent.mockResolvedValue(null);
    mockedRepo.update.mockResolvedValue({
      ...TOP_LEVEL,
      title: "Languages",
    } as never);
    const category = await update("cat-1", "Languages", undefined);
    expect(category.title).toBe("Languages");
    expect(mockedRepo.update).toHaveBeenCalledWith("cat-1", {
      title: "Languages",
      parentId: undefined,
    });
  });
});

describe("remove", () => {
  test("404s when the category doesn't exist", async () => {
    mockedRepo.getById.mockResolvedValue(null);
    await expect(remove("missing")).rejects.toThrow(NotFoundError);
  });

  test("blocks deleting a category that still has subcategories", async () => {
    mockedRepo.getById.mockResolvedValue(TOP_LEVEL as never);
    mockedRepo.hasSubcategories.mockResolvedValue(true);
    await expect(remove("cat-1")).rejects.toThrow(ConflictError);
    expect(mockedRepo.remove).not.toHaveBeenCalled();
  });

  test("deletes an empty category", async () => {
    mockedRepo.getById.mockResolvedValue(SUB as never);
    mockedRepo.hasSubcategories.mockResolvedValue(false);
    mockedRepo.remove.mockResolvedValue(true);
    await remove("cat-2");
    expect(mockedRepo.remove).toHaveBeenCalledWith("cat-2");
  });
});

describe("getTree", () => {
  test("nests subcategories, attaches per-page counts, and appends an alphabetically-sorted Uncategorized entry", async () => {
    mockedRepo.listAll.mockResolvedValue([TOP_LEVEL, SUB] as never);
    mockedRepo.countItemsPerCategory.mockResolvedValue([
      {
        category_id: "cat-1",
        collection_count: "2",
        deck_count: "1",
        public_deck_count: "4",
      },
      {
        category_id: "cat-2",
        collection_count: "0",
        deck_count: "3",
        public_deck_count: "0",
      },
      {
        category_id: null,
        collection_count: "1",
        deck_count: "0",
        public_deck_count: "2",
      },
    ] as never);

    const tree = await getTree();

    expect(tree.map((n) => n.title)).toEqual([
      "Language Learning",
      "Uncategorized",
    ]);
    const languageLearning = tree[0];
    expect(languageLearning.officialCount).toBe(3);
    expect(languageLearning.publicCount).toBe(4);
    expect(languageLearning.subcategories).toHaveLength(1);
    expect(languageLearning.subcategories[0]).toMatchObject({
      id: "cat-2",
      title: "German",
      officialCount: 3,
      publicCount: 0,
    });
    expect(tree[1]).toMatchObject({
      id: "uncategorized",
      officialCount: 1,
      publicCount: 2,
    });
  });
});

test("ValidationError, NotFoundError and ConflictError carry the expected HTTP status", () => {
  expect(new ValidationError("x").httpStatus).toBe(422);
  expect(new NotFoundError().httpStatus).toBe(404);
  expect(new ConflictError("x").httpStatus).toBe(409);
});
