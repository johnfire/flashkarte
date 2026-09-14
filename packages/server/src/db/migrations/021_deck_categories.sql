-- Two-level category/subcategory system for official decks and collections,
-- plus a German-aware collation, so the App Decks page can group hundreds
-- of items (e.g. "Language Learning" > "German") instead of two flat
-- sections, and sort alphabetically the way a German speaker expects.

CREATE COLLATION IF NOT EXISTS de_phonebook (provider = icu, locale = 'de-u-co-phonebk');

CREATE TABLE IF NOT EXISTS deck_categories (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      citext NOT NULL,
  -- NULL = top-level category; non-null = subcategory of that row.
  -- ON DELETE RESTRICT: deleting a category that still has subcategories
  -- under it fails outright rather than cascading — the admin must move or
  -- delete them first.
  parent_id  uuid REFERENCES deck_categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sibling titles must be unique, but "General" can exist under many
-- different parents — so uniqueness is scoped per level, not global.
-- A plain UNIQUE(parent_id, title) doesn't work for top-level rows since
-- Postgres treats every NULL as distinct; a partial index is needed there.
CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_categories_top_level_title
  ON deck_categories (title) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_categories_sub_title
  ON deck_categories (parent_id, title) WHERE parent_id IS NOT NULL;

-- Enforce exactly two levels: a row may only become a parent if it is
-- itself top-level. Deleting is handled separately by the FK's
-- ON DELETE RESTRICT above.
CREATE OR REPLACE FUNCTION deck_categories_enforce_two_levels()
RETURNS trigger AS $$
DECLARE
  parent_has_parent boolean;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT (parent_id IS NOT NULL) INTO parent_has_parent
    FROM deck_categories WHERE id = NEW.parent_id;
    IF parent_has_parent IS NULL THEN
      RAISE EXCEPTION 'parent category % does not exist', NEW.parent_id;
    END IF;
    IF parent_has_parent THEN
      RAISE EXCEPTION 'categories can only be nested two levels deep';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deck_categories_two_levels ON deck_categories;
CREATE TRIGGER trg_deck_categories_two_levels
  BEFORE INSERT OR UPDATE OF parent_id ON deck_categories
  FOR EACH ROW EXECUTE FUNCTION deck_categories_enforce_two_levels();

-- A collection or standalone deck attaches to at most one category or
-- subcategory (both live in deck_categories); NULL means uncategorized —
-- kept as the absence of a row rather than a sentinel "Uncategorized" row,
-- so it can't be accidentally renamed or deleted.
ALTER TABLE deck_collections ADD COLUMN IF NOT EXISTS category_id uuid
  REFERENCES deck_categories(id) ON DELETE SET NULL;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS category_id uuid
  REFERENCES deck_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deck_collections_category ON deck_collections (category_id)
  WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decks_category ON decks (category_id)
  WHERE category_id IS NOT NULL;
