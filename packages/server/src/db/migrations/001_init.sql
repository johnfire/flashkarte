CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS decks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  source_filename text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);

CREATE TABLE IF NOT EXISTS cards (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id    uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  type       text NOT NULL DEFAULT 'basic',
  content    jsonb NOT NULL,
  category   text,
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);

CREATE TABLE IF NOT EXISTS card_progress (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id          uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  repetitions      int NOT NULL DEFAULT 0,
  ease_factor      real NOT NULL DEFAULT 2.5,
  interval_days    int NOT NULL DEFAULT 0,
  due_at           timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_card_progress_due ON card_progress(user_id, due_at);
