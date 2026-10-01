-- A free user may keep content after a downgrade while choosing which units
-- remain active. Absence means active, so this table only stores overrides.
CREATE TABLE IF NOT EXISTS billing_unit_states (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_type  text NOT NULL CHECK (unit_type IN (
    'deck', 'course', 'subject', 'course_collection'
  )),
  unit_id    uuid NOT NULL,
  active     boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unit_type, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_unit_states_user_active
  ON billing_unit_states(user_id, active);
