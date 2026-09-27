ALTER TABLE decks ADD COLUMN content_language text
  CONSTRAINT decks_content_language_check CHECK (content_language IN ('en', 'de', 'ar'));
ALTER TABLE courses ADD COLUMN content_language text
  CONSTRAINT courses_content_language_check CHECK (content_language IN ('en', 'de', 'ar'));
ALTER TABLE deck_collections ADD COLUMN content_language text
  CONSTRAINT deck_collections_content_language_check CHECK (content_language IN ('en', 'de', 'ar'));

CREATE TABLE content_language_preferences (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page text NOT NULL CHECK (page IN ('library', 'courses', 'decks')),
  language text NOT NULL CHECK (language IN ('all', 'en', 'de', 'ar')),
  PRIMARY KEY (user_id, page)
);

-- These IDs were classified after inspecting actual lesson summaries and card backs
-- on LearnWohl on 2026-09-27. Unreviewed content remains NULL under All.
UPDATE subjects SET locale = 'en'
WHERE id IN (
  '7b23ec4c-9d6b-4184-a459-908556907b04',
  'b6cd1a8e-c196-4155-930a-f3812178d907'
) AND locale IS NULL;

UPDATE decks SET content_language = 'ar' WHERE id IN (
  '90f42dd3-c642-41c1-bd4d-11f79695e134',
  '768aca1f-3953-4803-b713-2bc60abd353c',
  'b75286eb-0d7c-40ef-ac9e-caa519bf292e',
  '4af6d705-be3d-47da-b3c6-9d68ac3d1caa',
  '140aacbe-9595-460a-9f4b-a79e62a4d8e4',
  '0c21bc61-1070-4e04-81fa-79a38941c14d'
);

UPDATE decks SET content_language = 'en' WHERE id IN (
  '063ba4b9-9d79-48b8-979b-ed97e4bcdbb1',
  '75f9b2dc-52d6-4cd8-9168-3bce09f95dac',
  '7965f743-6063-4baf-a4ac-b247f57036ff',
  '88af3a70-56f0-45ec-ba88-480b32038428',
  '8c3a723b-c1e3-4497-b566-a29d66245bba',
  '139a67d9-6579-4318-9a57-fd90f327abba',
  '8ca4ec7a-9e7f-4c4d-bffa-6b640b1155cc',
  'fdc9c83f-6857-45da-aab1-4f3d707d2628',
  'ea02e7f7-479f-436f-911c-9d3175989c40',
  '266eb0c2-386e-45cc-8ca0-5028cfbec4bb',
  'ec8662bc-6efd-4f47-9254-eefbfb2dca65',
  'c1581e6d-124b-4199-97a3-a07ec8864a5d',
  '1be176cf-5f79-4faa-a24d-65bf33f8396f'
);

UPDATE deck_collections SET content_language = 'ar'
WHERE id = '0b5d0f79-8a3c-4c09-a223-cdee59fe70d5';

INSERT INTO audit_log (actor_type, actor_id, action, target_type, target_id, correlation_id, outcome, after_state)
SELECT 'ai-agent', 'codex:language-classification', 'content_language.classified', 'subject', id,
       'migration:033_content_languages', 'success', jsonb_build_object('locale', locale)
FROM subjects WHERE id IN (
  '7b23ec4c-9d6b-4184-a459-908556907b04',
  'b6cd1a8e-c196-4155-930a-f3812178d907'
) AND locale = 'en';

INSERT INTO audit_log (actor_type, actor_id, action, target_type, target_id, correlation_id, outcome, after_state)
SELECT 'ai-agent', 'codex:language-classification', 'content_language.classified', 'deck', id,
       'migration:033_content_languages', 'success', jsonb_build_object('content_language', content_language)
FROM decks WHERE content_language IS NOT NULL;

INSERT INTO audit_log (actor_type, actor_id, action, target_type, target_id, correlation_id, outcome, after_state)
SELECT 'ai-agent', 'codex:language-classification', 'content_language.classified', 'deck_collection', id,
       'migration:033_content_languages', 'success', jsonb_build_object('content_language', content_language)
FROM deck_collections WHERE id = '0b5d0f79-8a3c-4c09-a223-cdee59fe70d5'
  AND content_language = 'ar';
