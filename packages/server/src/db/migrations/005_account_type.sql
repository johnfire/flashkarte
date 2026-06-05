-- Account type (#14): user tier / entitlement. Distinct from `role` (auth).
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'free';

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_account_type_chk
    CHECK (account_type IN ('free', 'paid', 'admin-gifted', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
