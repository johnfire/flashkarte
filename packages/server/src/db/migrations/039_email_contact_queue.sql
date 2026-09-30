CREATE TABLE IF NOT EXISTS email_campaigns (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category        text NOT NULL DEFAULT 'service_announcement',
  subject         text NOT NULL,
  text_body       text NOT NULL,
  html_body       text NOT NULL,
  status          text NOT NULL DEFAULT 'queued',
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count      integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  CONSTRAINT email_campaigns_category_chk
    CHECK (category IN ('service_announcement')),
  CONSTRAINT email_campaigns_status_chk
    CHECK (status IN ('queued', 'sending', 'completed', 'failed', 'cancelled')),
  CONSTRAINT email_campaigns_subject_chk
    CHECK (char_length(btrim(subject)) BETWEEN 1 AND 200),
  CONSTRAINT email_campaigns_text_body_chk
    CHECK (char_length(btrim(text_body)) BETWEEN 1 AND 20000)
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       uuid NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_email   citext NOT NULL,
  recipient_name    text,
  state             text NOT NULL DEFAULT 'pending',
  attempt_count     integer NOT NULL DEFAULT 0,
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  claimed_at        timestamptz,
  claimed_by        text,
  sent_at           timestamptz,
  smtp_message_id   text,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_deliveries_state_chk
    CHECK (state IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  CONSTRAINT email_deliveries_attempts_chk
    CHECK (attempt_count >= 0),
  UNIQUE (campaign_id, recipient_email)
);

CREATE INDEX IF NOT EXISTS email_deliveries_due_idx
  ON email_deliveries (state, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS email_deliveries_campaign_idx
  ON email_deliveries (campaign_id, state);
