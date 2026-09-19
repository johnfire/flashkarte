# Library categories & alphabetical sort (App Decks page)

Status: validated with Chris in chat before building; this doc records the
agreed design.

## Problem

The App Decks page (`/app-decks`) is a flat "Collections" section plus a
flat "Other Official Decks" section, both ordered however Postgres's default
collation happens to sort `title`. As the library grows (Chris expects
hundreds/thousands of official decks — see the collections addendum in
[2026-09-12-official-decks-design.md](2026-09-12-official-decks-design.md)),
there's no way to group related material (e.g. "Language Learning > German",
"AI") and no locale-aware alphabetical sort, so German titles with
ä/ö/ü/ß don't sort the way a German speaker expects.

## Data model

- `deck_categories (id uuid PK, title citext NOT NULL, parent_id uuid NULL
REFERENCES deck_categories(id), created_at, updated_at)`. `parent_id NULL`
  = top-level category; non-null = subcategory. Unique on `(parent_id,
title)` so sibling titles can't collide but the same subcategory name can
  exist under different parents.
- A trigger enforces exactly two levels: inserting/updating a row with
  `parent_id` set is rejected if that parent itself already has a
  `parent_id` (no 3rd level).
- A second trigger blocks deleting a category that still has subcategories
  (`RESTRICT`, not cascade) — no silent data loss; the admin must move or
  delete the subcategories first.
- `deck_collections.category_id` and `decks.category_id`: nullable FK →
  `deck_categories(id)`, `ON DELETE SET NULL`. Either column may point at a
  top-level category **or** a subcategory row (both live in the same table)
  — a collection or standalone deck attaches to exactly one node, never
  both a category and a subcategory at once.
- `NULL` category means "uncategorized" — no sentinel row. Kept virtual (not
  a real `deck_categories` row) so it can't be accidentally renamed/deleted,
  and so "does this item have a category" stays a simple `IS NULL` check.

### Locale-aware sort

```sql
CREATE COLLATION IF NOT EXISTS de_phonebook (provider = icu, locale = 'de-u-co-phonebk');
```

Created once in a migration; Postgres 16 (already in use, `postgres:16-alpine`
in `docker-compose.prod.yml`) ships ICU support by default, so no extra
extension/package is needed. Every `ORDER BY title` touched by this feature
(categories, subcategories, collections, decks) sorts
`COLLATE de_phonebook ASC` instead of the default collation. Existing
non-library sorts (e.g. deck titles in `DeckListPage`) are unaffected —
out of scope for this change.

## API

### Admin (category management)

- `GET /admin/categories` — full two-level tree with item counts, for
  admin-UI pickers.
- `POST /admin/categories` — `{ title, parentId? }`. `parentId` omitted/null
  creates a top-level category; set creates a subcategory (rejected if the
  named parent is itself a subcategory).
- `PATCH /admin/categories/:id` — rename and/or reparent (subject to the
  same two-level and uniqueness rules).
- `DELETE /admin/categories/:id` — rejected (409) if subcategories exist
  under it. Items pointing at the deleted category fall back to
  uncategorized via `ON DELETE SET NULL`.

### Admin (assignment)

- `PATCH /admin/decks/:id` — `{ categoryId }` (null clears it). Separate
  from `promote-official` so recategorizing an already-official deck
  doesn't require re-promoting it.
- `PATCH /admin/collections/:id` — `{ categoryId }`, same semantics.

### Browse

- `GET /categories` — the full tree with counts, unpaginated (small at any
  realistic category count). Drives the top-level section list on
  `/app-decks`. (Mounted as its own domain rather than under `/library` —
  that prefix already names the unrelated public-library-of-shared-decks
  feature from migration 006, so reusing it here would have been
  confusing.)
- `GET /decks/official/collections` and `GET /decks/official` gain an
  optional `categoryId` filter (a literal `uncategorized` value selects the
  `IS NULL` bucket). Existing `q`/`limit`/`offset` pagination is unchanged —
  each category/subcategory's contents page in 30 at a time exactly like
  today's two sections do.

## UI

### `/app-decks`

- On load, fetch `/categories` once (cheap, unpaginated) and render
  each top-level category as a collapsible section, sorted alphabetically
  (server-side, ICU collation). A category with subcategories nests them,
  also alphabetical, one level in and independently collapsible.
- Expanding a category or subcategory lazily loads its Collections then its
  standalone decks (both alphabetical) via the existing `usePaginatedList`
  hook, scoped with `categoryId`, reusing `CollectionRow`/`OfficialDeckRow`
  unchanged.
- "Uncategorized" is not visually special-cased — it's a normal entry in
  the same alphabetically-sorted list of sections (via
  `categoryId=uncategorized`), so it sorts whatever position "U" falls at.
- Search is unchanged: the existing flat, ungrouped search box still
  searches across everything regardless of category. Grouping search
  results by category is out of scope (see below).

### Admin (`/admin`)

- New "Categories" panel: two-level tree view with create/rename for
  top-level categories and their subcategories, and delete (blocked with an
  inline error if subcategories still exist).
- Wherever a deck/collection can currently be promoted to official, add a
  category picker (flat list showing "Category" and "Category ›
  Subcategory" options, plus "None") that calls the new `PATCH` endpoints.

## Explicitly out of scope

- Grouping search results by category — search stays flat/global as today.
- Manual (non-alphabetical) ordering of categories, subcategories, or items
  within them — alphabetical (ICU) only, matching what was asked for.
- More than two levels of nesting.
- Multi-category tagging (an item belongs to at most one category or
  subcategory, mirroring the existing "at most one collection" rule).
- Retroactively re-sorting/relocating the six existing CEFR decks/their
  collection into a category — left uncategorized until Chris assigns one
  via the new admin UI.

---

## Addendum (same day): extended to the public Library page

Chris asked for the same organization on `/library` — the public library of
user-published decks (`decks.is_public`, migration 006), distinct from
App Decks' admin-curated content — plus a real fix: promoting a deck to
official didn't clear `is_public`/`published_at`, so a deck that was public
before promotion (the six original CEFR decks) kept leaking into Library as
a duplicate of what App Decks already showed.

### Decisions

- Library reuses the **same** `deck_categories` tree as App Decks — one
  category system app-wide, not a parallel one.
- Only Chris assigns a category to a Library deck (via the admin panel),
  matching App Decks — a deck's owner never picks one at publish time.
- Official decks are excluded from Library outright: `listPublic` now
  filters `is_public AND NOT is_official`, and `promoteToOfficial` clears
  `is_public = false, published_at = NULL` at promotion time so the data
  stays honest going forward, not just filtered at query time.

### Data model

No new tables — `decks.category_id` (added in the base migration) is
already usable for public decks with zero schema work, since public and
official decks live in the same `decks` table.

### API

- `listPublic`/`GET /library` and `GET /public/library` (the same query,
  shared by both routes) gain the same `categoryId` filter and real
  `limit`/`offset` pagination as the App Decks endpoints, replacing the old
  flat `LIMIT 100`. Sort switched from `published_at DESC` to
  `title COLLATE de_phonebook ASC`, matching App Decks.
- `GET /categories` is unchanged and reused as-is by Library.
- Item counts are no longer a single combined number: `CategoryNode` now
  carries `officialCount` (collections + standalone official decks) and
  `publicCount` (Library decks) separately, so each page's badge reflects
  only what it actually displays instead of a misleading combined total.
- `setDeckCategory` broadened from official-only to
  `WHERE is_official OR is_public`, so it also works on Library decks.
- The shared `categoryFilterSql` SQL-fragment helper moved from
  `decks.repository.ts` into `library.repository.ts` (alongside the
  existing `escapeLike`) since it's now used by both domains — one home for
  generic browse-query helpers, matching the existing pattern.

### UI

- `CategorySection` (the collapsible tree-node shell) was generalized to
  accept `getItemCount`/`renderContents` props instead of hardcoding the
  App-Decks-specific contents component, so both pages share the
  expand/collapse/alphabetical-tree logic with no duplication.
- `/library` gets the same shape as `/app-decks`: a category tree by
  default, lazy-loaded per section (`LibraryCategoryContents`), and a flat
  cross-category search fallback (`LibrarySearchResults`) — both reusing a
  new `LibraryDeckRow` for the actual deck+Clone-button row.
- Admin's "Assign categories" panel gained a third results section
  (Library decks, searched via the same box) alongside the existing
  Collections/Standalone-decks sections.
