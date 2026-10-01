-- Store half-day intervals without rounding Hard reviews up to a full day.
ALTER TABLE card_progress
  ALTER COLUMN interval_days TYPE double precision
  USING interval_days::double precision;

ALTER TABLE question_reviews
  ALTER COLUMN interval_days TYPE double precision
  USING interval_days::double precision;
