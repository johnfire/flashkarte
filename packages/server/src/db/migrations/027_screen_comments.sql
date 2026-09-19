-- Comments the owner leaves on a screen while learning their own subject (slice 3). They tell the
-- author (usually the owner's AI, through MCP) what is unclear or wrong, against the screen's
-- permanent number. Additive only. Removed with the user or the screen.
CREATE TABLE IF NOT EXISTS screen_comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  screen_id   uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  body        text NOT NULL CONSTRAINT screen_comments_body CHECK (length(btrim(body)) > 0 AND length(body) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Set when the comment has been dealt with, by the person or by their AI.
  resolved_at timestamptz,
  resolved_by text CONSTRAINT screen_comments_resolver CHECK (resolved_by IN ('human', 'ai'))
);
CREATE INDEX IF NOT EXISTS idx_screen_comments_screen ON screen_comments(screen_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_screen_comments_user ON screen_comments(user_id, created_at);
