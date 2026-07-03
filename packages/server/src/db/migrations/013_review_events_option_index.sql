-- 013_review_events_option_index.sql
-- Spec 01 (diagnostic answers): record WHICH multiple-choice option the learner
-- picked on a diagnostic card, so a wrong answer becomes diagnostic signal
-- (Spec 05 mines it for confusion pairs). Nullable — the ledger stays immutable
-- and append-only, and old clients that omit it keep working unchanged.
ALTER TABLE review_events
  ADD COLUMN IF NOT EXISTS option_index int NULL;
