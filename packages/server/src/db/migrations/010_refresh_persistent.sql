-- 010_refresh_persistent.sql
-- Track whether a refresh token was issued for a persistent ("remember me")
-- session so the rotated replacement inherits the same cookie lifetime.
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS persistent boolean NOT NULL DEFAULT true;
