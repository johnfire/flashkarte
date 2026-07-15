CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type      text NOT NULL,
  actor_id        text NOT NULL,
  action          text NOT NULL,
  target_type     text,
  target_id       uuid,
  correlation_id  text,
  outcome         text NOT NULL,
  before_state    jsonb,
  after_state     jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Immutability: reject UPDATE/DELETE at the DB level. A separate, tightly-scoped
-- retention/archival job may prune old entries per a documented policy, but the
-- application itself can never mutate history.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON audit_log (actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON audit_log (action, created_at DESC);
