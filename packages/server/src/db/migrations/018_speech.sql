-- Spoken cards (Spec 09): on-device text-to-speech, global defaults + per-deck
-- overrides. Every column is nullable or defaulted so existing rows and the
-- Android APKs already in the field keep working unchanged.

-- Global defaults. `speech_lang` is NULL for most users: resolution falls back
-- to users.language and then the device locale, so the read-aloud case needs no
-- configuration beyond the switch.
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_enabled  boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_lang     text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_autoplay text NOT NULL DEFAULT 'back';
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_rate     real NOT NULL DEFAULT 1.0;

-- Per-deck overrides. NULL means "inherit the user default" throughout; note
-- speech_enabled is deliberately TRI-STATE (NULL inherit / true on / false
-- muted) — a plain boolean could not express "global on, mute this one deck".
-- Front and back are separate languages: a de->en deck spoken in one voice
-- would pronounce the English translation as German.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_enabled    boolean;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_front_lang text;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_back_lang  text;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_autoplay   text;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_rate       real;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_speech_autoplay_chk
    CHECK (speech_autoplay IN ('off', 'front', 'back', 'both'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE decks ADD CONSTRAINT decks_speech_autoplay_chk
    CHECK (speech_autoplay IS NULL OR speech_autoplay IN ('off', 'front', 'back', 'both'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_speech_rate_chk
    CHECK (speech_rate >= 0.5 AND speech_rate <= 2.0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE decks ADD CONSTRAINT decks_speech_rate_chk
    CHECK (speech_rate IS NULL OR (speech_rate >= 0.5 AND speech_rate <= 2.0));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
