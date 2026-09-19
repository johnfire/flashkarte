-- Images a lesson uses (slice 5): an SVG kept in the database and pointed at by an image block as
-- `asset:<id>`. The server cleans the SVG before storing it and serves it as a plain image. The
-- same table later holds server-rendered maths (kind 'formula'). Additive only. Removed with the
-- subject, so account and subject deletion take it along.
CREATE TABLE IF NOT EXISTS assets (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('diagram', 'formula')),
  media_type  text NOT NULL DEFAULT 'image/svg+xml' CONSTRAINT assets_media_type CHECK (media_type = 'image/svg+xml'),
  content     text NOT NULL CONSTRAINT assets_content_size CHECK (length(content) BETWEEN 1 AND 200000),
  -- The author's note about what it is (not the alt text a learner hears, which lives on the block).
  description text CONSTRAINT assets_description CHECK (description IS NULL OR length(description) <= 300),
  -- Whether a person or an AI made it, like a screen's author.
  author_kind text NOT NULL CHECK (author_kind IN ('human', 'ai')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assets_subject ON assets(subject_id, created_at);
