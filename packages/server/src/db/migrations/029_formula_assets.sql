-- Server-rendered maths (slice 6): a formula's picture is an asset of kind 'formula', made once
-- when a screen is saved and reused for the same formula. Additive only. The columns describe the
-- formula and its rendered size in em (so a client can lay it out, and put an inline symbol on the
-- text baseline). Diagrams leave them empty.
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS latex     text,
  ADD COLUMN IF NOT EXISTS display   boolean,
  ADD COLUMN IF NOT EXISTS width_em  double precision,
  ADD COLUMN IF NOT EXISTS height_em double precision,
  ADD COLUMN IF NOT EXISTS depth_em  double precision;

DO $$ BEGIN
  ALTER TABLE assets ADD CONSTRAINT assets_formula_fields CHECK (
    kind <> 'formula' OR (latex IS NOT NULL AND display IS NOT NULL AND width_em IS NOT NULL
                          AND height_em IS NOT NULL AND depth_em IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One picture per formula and style in a subject.
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_formula_unique
  ON assets (subject_id, display, latex) WHERE kind = 'formula';
