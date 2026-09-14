import { query, queryOne } from "../../db/client";

export interface CategoryRow {
  id: string;
  title: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

const COLS = "id, title, parent_id, created_at, updated_at";

/** Every category and subcategory, alphabetical (German-aware) within each level. */
export function listAll() {
  return query<CategoryRow>(
    `SELECT ${COLS} FROM deck_categories
     ORDER BY title COLLATE de_phonebook ASC`,
  );
}

export function getById(id: string) {
  return queryOne<CategoryRow>(
    `SELECT ${COLS} FROM deck_categories WHERE id = $1`,
    [id],
  );
}

/** Whether a category has any subcategories under it (blocks delete). */
export async function hasSubcategories(id: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM deck_categories WHERE parent_id = $1) AS exists",
    [id],
  );
  return row?.exists ?? false;
}

/** Case-insensitive title match within a level, for pre-insert uniqueness checks. */
export function findByTitleAndParent(title: string, parentId: string | null) {
  return queryOne<{ id: string }>(
    parentId === null
      ? "SELECT id FROM deck_categories WHERE title = $1 AND parent_id IS NULL"
      : "SELECT id FROM deck_categories WHERE title = $1 AND parent_id = $2",
    parentId === null ? [title] : [title, parentId],
  );
}

export function create(title: string, parentId: string | null) {
  return queryOne<CategoryRow>(
    `INSERT INTO deck_categories (title, parent_id) VALUES ($1, $2)
     RETURNING ${COLS}`,
    [title, parentId],
  );
}

export function update(
  id: string,
  fields: { title?: string; parentId?: string | null },
) {
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id];
  if (fields.title !== undefined) {
    values.push(fields.title);
    sets.push(`title = $${values.length}`);
  }
  if (fields.parentId !== undefined) {
    values.push(fields.parentId);
    sets.push(`parent_id = $${values.length}`);
  }
  return queryOne<CategoryRow>(
    `UPDATE deck_categories SET ${sets.join(", ")} WHERE id = $1 RETURNING ${COLS}`,
    values,
  );
}

/** Returns false if the category doesn't exist; callers pre-check hasSubcategories. */
export async function remove(id: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    "DELETE FROM deck_categories WHERE id = $1 RETURNING id",
    [id],
  );
  return row !== null;
}

export interface CategoryCountRow {
  category_id: string | null;
  collection_count: string;
  deck_count: string;
}

/**
 * Items placed directly on each category/subcategory (collections, plus
 * standalone official decks — decks inside a collection are reached through
 * it, not counted separately). `category_id: null` is the uncategorized
 * bucket, grouped the same way any other value is.
 */
export function countItemsPerCategory() {
  return query<CategoryCountRow>(
    `SELECT category_id,
       count(*) FILTER (WHERE kind = 'collection') AS collection_count,
       count(*) FILTER (WHERE kind = 'deck') AS deck_count
     FROM (
       SELECT category_id, 'collection' AS kind FROM deck_collections
       UNION ALL
       SELECT category_id, 'deck' AS kind FROM decks
       WHERE is_official AND collection_id IS NULL
     ) items
     GROUP BY category_id`,
  );
}
