-- The primary owner account is an operational recovery anchor. It must remain
-- available even if its password is entered into the normal self-delete flow.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_deletion_protected boolean NOT NULL DEFAULT false;

UPDATE users
SET is_deletion_protected = true
WHERE email = 'car2187bus@pm.me';
