-- Verified email changes: keep the current address until the new address has
-- proved control of its mailbox. Tokens are hashed, single-use and short lived.
CREATE TABLE IF NOT EXISTS email_change_tokens (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  new_email citext NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_change_tokens_hash
  ON email_change_tokens(token_hash);
