import { query, queryOne } from "../../db/client";

export interface LibraryDeckRow {
  id: string;
  reference_number: number;
  title: string;
  author: string;
  card_count: string;
  published_at: string;
  category_id: string | null;
}

const AUTHOR = "COALESCE(NULLIF(trim(u.display_name), ''), 'Anonymous')";

// Escape LIKE/ILIKE metacharacters so a search term is matched literally;
// otherwise `q=%` (or `_`) matches every public deck. Paired with ESCAPE '\'.
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * Appends a category-filter SQL fragment and its parameter (if any) to
 * `values`, returning the fragment to AND into a query's WHERE clause.
 * `undefined` = no filter (a flat, cross-category search box), `null` = the
 * uncategorized bucket, a string = one specific category/subcategory id.
 * Shared by the official-decks browse queries (decks.repository.ts) and the
 * public-library browse query below — both scope a collapsible category
 * section to its own contents the same way.
 */
export function categoryFilterSql(
  column: string,
  categoryId: string | null | undefined,
  values: unknown[],
): string {
  if (categoryId === undefined) return "TRUE";
  if (categoryId === null) return `${column} IS NULL`;
  values.push(categoryId);
  return `${column} = $${values.length}`;
}

/**
 * Publicly-shared decks, searchable/paginated/category-filterable. Excludes
 * official decks — those are curated separately via App Decks, and a deck
 * that was public before being promoted to official (the six original CEFR
 * decks) would otherwise leak into this list as a duplicate of what App
 * Decks already shows.
 */
export function listPublic(
  q: string | null,
  limit: number,
  offset: number,
  categoryId?: string | null,
) {
  const term = q === null ? null : escapeLike(q);
  const values: unknown[] = [term];
  const categoryClause = categoryFilterSql("d.category_id", categoryId, values);
  values.push(limit, offset);
  return query<LibraryDeckRow>(
    `SELECT d.id, d.reference_number, d.title, ${AUTHOR} AS author,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       d.published_at, d.category_id
     FROM decks d JOIN users u ON u.id = d.user_id
     WHERE d.is_public AND NOT d.is_official
       AND ($1::text IS NULL OR d.title ILIKE '%' || $1 || '%' ESCAPE '\\')
       AND (${categoryClause})
     ORDER BY d.title COLLATE de_phonebook ASC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
}

export function getPublicDeck(id: string) {
  return queryOne<LibraryDeckRow & { source_filename: string | null }>(
    `SELECT d.id, d.reference_number, d.title, d.source_filename, ${AUTHOR} AS author,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       d.published_at, d.category_id
     FROM decks d JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND d.is_public AND NOT d.is_official`,
    [id],
  );
}

export function getPublicCards(deckId: string) {
  return query<{
    type: string;
    content: Record<string, unknown>;
    category: string | null;
    position: number;
  }>(
    `SELECT c.type, c.content, c.category, c.position
     FROM cards c JOIN decks d ON d.id = c.deck_id
     WHERE c.deck_id = $1 AND d.is_public AND NOT d.is_official
     ORDER BY c.position ASC`,
    [deckId],
  );
}
