-- Provider-neutral subscription state. Stripe and Google Play are both
-- external payment systems; neither client is allowed to grant entitlement.
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider              text NOT NULL CHECK (provider IN ('stripe', 'google_play')),
  provider_subscription_id text NOT NULL,
  plan                  text NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status                text NOT NULL CHECK (status IN (
    'pending', 'active', 'trialing', 'grace_period', 'past_due',
    'canceled', 'on_hold', 'expired'
  )),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean NOT NULL DEFAULT false,
  provider_payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user
  ON billing_subscriptions(user_id);

-- Webhook/event IDs are idempotency keys. A provider may retry delivery, and
-- processing the same event twice must not duplicate entitlement changes.
CREATE TABLE IF NOT EXISTS billing_events (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider       text NOT NULL CHECK (provider IN ('stripe', 'google_play')),
  provider_event_id text NOT NULL,
  received_at    timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz,
  processing_error text,
  UNIQUE (provider, provider_event_id)
);

-- Audit the entitlement boundary independently from payment-provider logs.
CREATE INDEX IF NOT EXISTS idx_billing_events_unprocessed
  ON billing_events(provider, processed_at)
  WHERE processed_at IS NULL;
