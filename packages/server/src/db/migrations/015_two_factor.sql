-- Opt-in TOTP two-factor auth (§13.1).
-- two_factor_secret_enc: AES-256-GCM-encrypted TOTP seed (iv||tag||ciphertext,
--   base64). Encrypted, not hashed — it must be decryptable to verify codes.
-- two_factor_backup: bcrypt hashes of the one-time backup codes; entries are
--   removed as they're consumed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_secret_enc text,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_backup text[] NOT NULL DEFAULT '{}';
