CREATE TABLE signup_promos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,40}$'),
  kind text NOT NULL CHECK (kind IN ('discount', 'free_access')),
  percent_off integer CHECK (percent_off BETWEEN 1 AND 100),
  discount_duration text CHECK (discount_duration IN ('once', 'forever')),
  free_days integer CHECK (free_days BETWEEN 1 AND 365),
  stripe_coupon_id text,
  eligible_plan text NOT NULL CHECK (eligible_plan IN ('any', 'monthly', 'yearly')),
  expires_at timestamptz,
  max_activations integer CHECK (max_activations > 0),
  activation_count integer NOT NULL DEFAULT 0 CHECK (activation_count >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'discount' AND percent_off IS NOT NULL AND discount_duration IS NOT NULL
      AND stripe_coupon_id IS NOT NULL AND free_days IS NULL)
    OR (kind = 'free_access' AND free_days IS NOT NULL AND percent_off IS NULL
      AND discount_duration IS NULL AND stripe_coupon_id IS NULL AND eligible_plan = 'any')
  )
);

CREATE TABLE signup_promo_activations (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  promo_id uuid NOT NULL REFERENCES signup_promos(id),
  signup_plan text NOT NULL CHECK (signup_plan IN ('free', 'monthly', 'yearly')),
  access_expires_at timestamptz,
  stripe_checkout_id text,
  activated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX signup_promo_activations_promo ON signup_promo_activations(promo_id);
