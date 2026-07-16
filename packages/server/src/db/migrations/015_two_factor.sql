-- Opt-in TOTP two-factor auth (§13.1).
-- The two_factor_secret_enc column holds the AES-256-GCM-encrypted TOTP seed
--   (iv||tag||ciphertext, base64). Encrypted, not hashed — verification needs
--   the plaintext seed back.
-- The two_factor_backup column holds bcrypt hashes of the one-time backup
--   codes; entries are removed as they're consumed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS two_factor_secret_enc text,
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_backup text[] NOT NULL DEFAULT '{}';
