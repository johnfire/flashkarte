CREATE TABLE IF NOT EXISTS email_service_tenants (
  slug          text PRIMARY KEY,
  from_address  text NOT NULL,
  reply_to      text,
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_service_recipients (
  id                         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_slug                text NOT NULL REFERENCES email_service_tenants(slug) ON DELETE CASCADE,
  external_user_id           text NOT NULL,
  email                      citext NOT NULL,
  display_name               text,
  email_verified             boolean NOT NULL DEFAULT false,
  service_announcements_opt_in boolean NOT NULL DEFAULT true,
  product_updates_opt_in     boolean NOT NULL DEFAULT false,
  active                     boolean NOT NULL DEFAULT true,
  suppressed_at              timestamptz,
  suppression_reason         text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, external_user_id)
);

CREATE INDEX IF NOT EXISTS email_service_recipients_eligibility_idx
  ON email_service_recipients (
    tenant_slug,
    active,
    email_verified,
    service_announcements_opt_in,
    product_updates_opt_in
  );

CREATE TABLE IF NOT EXISTS email_service_campaigns (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_slug     text NOT NULL REFERENCES email_service_tenants(slug) ON DELETE RESTRICT,
  category        text NOT NULL,
  from_address    text NOT NULL,
  reply_to        text,
  subject         text NOT NULL,
  text_body       text NOT NULL,
  html_body       text NOT NULL,
  status          text NOT NULL DEFAULT 'queued',
  created_by      text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count      integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  CONSTRAINT email_service_campaigns_category_chk
    CHECK (category IN ('transactional', 'service_announcement', 'product_update')),
  CONSTRAINT email_service_campaigns_status_chk
    CHECK (status IN ('queued', 'sending', 'completed', 'failed', 'cancelled')),
  CONSTRAINT email_service_campaigns_subject_chk
    CHECK (char_length(btrim(subject)) BETWEEN 1 AND 200),
  CONSTRAINT email_service_campaigns_text_body_chk
    CHECK (char_length(btrim(text_body)) BETWEEN 1 AND 20000)
);

CREATE TABLE IF NOT EXISTS email_service_deliveries (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id           uuid NOT NULL REFERENCES email_service_campaigns(id) ON DELETE CASCADE,
  recipient_external_id text NOT NULL,
  recipient_email       citext NOT NULL,
  recipient_name        text,
  state                 text NOT NULL DEFAULT 'pending',
  attempt_count         integer NOT NULL DEFAULT 0,
  next_attempt_at       timestamptz NOT NULL DEFAULT now(),
  claimed_at            timestamptz,
  claimed_by            text,
  sent_at               timestamptz,
  smtp_message_id       text,
  last_error            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_service_deliveries_state_chk
    CHECK (state IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  CONSTRAINT email_service_deliveries_attempts_chk
    CHECK (attempt_count >= 0),
  UNIQUE (campaign_id, recipient_external_id)
);

CREATE INDEX IF NOT EXISTS email_service_deliveries_due_idx
  ON email_service_deliveries (state, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS email_service_deliveries_campaign_idx
  ON email_service_deliveries (campaign_id, state);
