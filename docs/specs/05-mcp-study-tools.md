# 05 — MCP study tools (close the AI-as-teacher loop)

**Priority:** 5 · **Effort:** ~1 week · **Scope:** server (read endpoints) + packages/mcp

## Goal

Give the user's AI read access to learning state and a review-submission tool, so it can
diagnose weaknesses and author targeted cards (via the existing `add_cards`).

## Current state (verified 2026-07-02)

MCP (`packages/mcp/src/tools/decks.ts`) has 5 deck-CRUD tools; no study/progress access.
API keys have scopes (migration `012_api_key_scope.sql`). `review_events` +
`card_progress` hold everything needed. Depends on Spec 01 for `option_index` data and
Spec 02 for `confidence` (tools must degrade gracefully when those columns are NULL).

## New endpoints (server, API-key auth, respect key scope — add a `study` scope if the

scope model requires enumeration)

1. `GET /api/study/summary?deckId=` → per-deck: stats (existing `getStats` shape) +
   calibration buckets (Spec 02 shared function) + counts by scheduler state.
2. `GET /api/study/struggling?deckId=&limit=20` → cards ranked worst-first by:
   last_rating ≤ 2, then low ease/stability, then sure+wrong events in last 30 days.
   Returns card id, front, back, category, metrics. (One SQL query; no ML.)
3. `GET /api/study/confusions?deckId=` → from `review_events.option_index` on diagnostic
   cards: per card, count per wrong option chosen, with option text resolved. Empty array
   when no data — never an error.
4. `POST /api/study/review {cardId, rating, confidence?}` — already exists for JWT;
   ensure API-key auth path works and writes the ledger identically.

## MCP tools (`packages/mcp/src/tools/study.ts`)

- `get_study_summary(deck_id?)`, `get_struggling_cards(deck_id?, limit?)`,
  `get_confusion_pairs(deck_id?)`, `submit_review(card_id, rating, confidence?)`.
- Tool descriptions must teach the workflow, e.g. `get_struggling_cards`: "…then use
  add_cards to append remediation cards targeting these specific confusions, using the
  diagnostic-answer syntax (see create_deck description)."
- Update `create_deck`/`add_cards` descriptions with the Spec 01 diagnostic syntax and
  Spec 03 image syntax.

## Constraints

- Read tools must be cheap: LIMIT everything, index check on `review_events(user_id, card_id)`
  (exists) — add `(user_id, reviewed_at)` if the struggling query needs it (same migration).
- No LLM calls server-side — the AI compute stays on the user's account (project principle).
- All tools scoped to the API key's user; no cross-user access paths.

## Acceptance criteria

1. Each tool returns sensible JSON on a real deck; empty-but-valid on a fresh deck
   (no 500s on missing progress/option/confidence data).
2. `submit_review` via API key writes a `review_events` row identical in shape to a JWT
   review, and reschedules the card.
3. A revoked/wrong-scope key gets 401/403 on all four endpoints.
4. End-to-end demo test (scripted): seed reviews with wrong options → `get_confusion_pairs`
   surfaces them → `add_cards` with a remediation card succeeds.

## Tests

Server: endpoint auth matrix + SQL correctness with seeded events. MCP: Vitest tool tests
(existing pattern) incl. degraded/empty responses.
