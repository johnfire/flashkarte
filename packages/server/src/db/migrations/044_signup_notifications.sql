ALTER TABLE email_campaigns
  DROP CONSTRAINT IF EXISTS email_campaigns_category_chk;
ALTER TABLE email_campaigns
  ADD CONSTRAINT email_campaigns_category_chk
    CHECK (category IN ('service_announcement', 'signup_notification'));

-- Event identity survives account deletion and prevents duplicate enqueues.
ALTER TABLE email_campaigns
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS correlation_id text;
CREATE UNIQUE INDEX IF NOT EXISTS email_campaigns_event_key_idx
  ON email_campaigns (event_key);
