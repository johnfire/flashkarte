import { z } from "zod";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as repo from "./categories.repository";
import type { CategoryRow } from "./categories.repository";

export interface CategoryNode {
  id: string;
  title: string;
  parentId: string | null;
  // Counted separately, not combined, so each browse page's badge reflects
  // only what it actually displays: App Decks shows officialCount
  // (collections + standalone official decks), Library shows publicCount
  // (public, non-official decks).
  officialCount: number;
  publicCount: number;
  subcategories: CategoryNode[];
}

const titleSchema = z
  .string({ error: "title is required" })
  .trim()
  .min(1, "title must not be blank")
  .max(200, "title is too long");

const parentIdSchema = z
  .string({ error: "parentId must be text" })
  .min(1)
  .nullable()
  .optional();

/** Throws if parentId names something other than a top-level category. */
async function validateParent(parentId: string): Promise<void> {
  const parent = await repo.getById(parentId);
  if (!parent) throw new NotFoundError("Parent category not found");
  if (parent.parent_id !== null) {
    throw new ValidationError("categories can only be nested two levels deep");
  }
}

function toCategory(row: CategoryRow) {
  return {
    id: row.id,
    title: row.title,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(titleIn: unknown, parentIdIn: unknown) {
  const title = parse(titleSchema, titleIn);
  const parentId = parse(parentIdSchema, parentIdIn) ?? null;
  if (parentId !== null) await validateParent(parentId);
  if (await repo.findByTitleAndParent(title, parentId)) {
    throw new ValidationError(
      parentId === null
        ? "A category with this title already exists"
        : "A subcategory with this title already exists under that category",
    );
  }
  const row = await repo.create(title, parentId);
  if (!row) throw new Error("Failed to create category");
  return toCategory(row);
}

export async function update(
  id: string,
  titleIn: unknown,
  parentIdIn: unknown,
) {
  const current = await repo.getById(id);
  if (!current) throw new NotFoundError("Category not found");

  const title = titleIn === undefined ? undefined : parse(titleSchema, titleIn);
  const parentId =
    parentIdIn === undefined
      ? undefined
      : (parse(parentIdSchema, parentIdIn) ?? null);

  if (parentId !== undefined) {
    if (parentId === id) {
      throw new ValidationError("A category cannot be its own parent");
    }
    if (parentId !== null) {
      await validateParent(parentId);
      if (await repo.hasSubcategories(id)) {
        throw new ValidationError(
          "A category with subcategories cannot itself become a subcategory",
        );
      }
    }
  }

  const nextTitle = title ?? current.title;
  const nextParentId = parentId === undefined ? current.parent_id : parentId;
  if (title !== undefined || parentId !== undefined) {
    const conflict = await repo.findByTitleAndParent(nextTitle, nextParentId);
    if (conflict && conflict.id !== id) {
      throw new ValidationError(
        "Another category already uses this title at this level",
      );
    }
  }

  const row = await repo.update(id, { title, parentId });
  if (!row) throw new NotFoundError("Category not found");
  return toCategory(row);
}

export async function remove(id: string): Promise<void> {
  const current = await repo.getById(id);
  if (!current) throw new NotFoundError("Category not found");
  if (await repo.hasSubcategories(id)) {
    throw new ConflictError(
      "Move or delete its subcategories before deleting this category",
    );
  }
  await repo.remove(id);
}

/** German-locale compare for the small, in-memory top-level list (incl. the synthetic Uncategorized entry). */
function byTitle(a: { title: string }, b: { title: string }): number {
  return a.title.localeCompare(b.title, "de");
}

const UNCATEGORIZED_ID = null;

/** Full two-level tree with item counts, alphabetical at every level, for both the admin picker and the browse page. */
interface Counts {
  officialCount: number;
  publicCount: number;
}

const ZERO_COUNTS: Counts = { officialCount: 0, publicCount: 0 };

export async function getTree(): Promise<CategoryNode[]> {
  const [rows, counts] = await Promise.all([
    repo.listAll(),
    repo.countItemsPerCategory(),
  ]);

  const countByCategory = new Map<string | null, Counts>();
  for (const row of counts) {
    countByCategory.set(row.category_id, {
      officialCount: Number(row.collection_count) + Number(row.deck_count),
      publicCount: Number(row.public_deck_count),
    });
  }

  const subcategoriesByParent = new Map<string, CategoryNode[]>();
  for (const row of rows) {
    if (row.parent_id === null) continue;
    const node: CategoryNode = {
      id: row.id,
      title: row.title,
      parentId: row.parent_id,
      ...(countByCategory.get(row.id) ?? ZERO_COUNTS),
      subcategories: [],
    };
    const siblings = subcategoriesByParent.get(row.parent_id) ?? [];
    siblings.push(node);
    subcategoriesByParent.set(row.parent_id, siblings);
  }

  const topLevel: CategoryNode[] = rows
    .filter((row) => row.parent_id === null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      parentId: null,
      ...(countByCategory.get(row.id) ?? ZERO_COUNTS),
      subcategories: subcategoriesByParent.get(row.id) ?? [],
    }));

  const uncategorized: CategoryNode = {
    id: "uncategorized",
    title: "Uncategorized",
    parentId: UNCATEGORIZED_ID,
    ...(countByCategory.get(null) ?? ZERO_COUNTS),
    subcategories: [],
  };

  return [...topLevel, uncategorized].sort(byTitle);
}
