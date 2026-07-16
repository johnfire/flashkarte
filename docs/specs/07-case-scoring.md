# 07 — Case scoring & path persistence (branch play becomes a learning mode)

**Priority:** 7 — the clinical-case feature · **Effort:** ~1–2 weeks
**Scope:** shared parser + server + Android play engine; web play in Spec 08

## Goal

Branch decks (cases) get consequences and memory: options carry quality markers, a
completed run yields a score, runs are persisted, and badly-handled cases come back —
spaced repetition of scenarios, not just facts.

## Current state (verified 2026-07-02)

Branch play (`android/.../ui/screens/play/BranchPlayViewModel.kt`) walks the graph with
zero persistence: no completion record, no score, no revisit scheduling.

## Markdown contract (parser change — TS + Kotlin + corpus)

Optional quality marker at the end of an option line:

```markdown
[chest-pain]
**3. 55-year-old, crushing chest pain, diaphoresis. First action?**

- ECG within 10 minutes -> ecg-result [best]
- Full history first -> history-path [ok]
- Discharge with antacids -> ending-bad [harm]
```

`[best] | [ok] | [harm]` — absent marker = neutral (unscored). Parsed into
`options[].quality` (`"best"|"ok"|"harm"|null`). Existing branch decks unchanged.

## Persistence (server) — new idempotent ledger, same pattern as `review_events`

Migration `0NN`:

```sql
CREATE TABLE path_events (
  event_id   UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  deck_id    UUID NOT NULL REFERENCES decks(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at   TIMESTAMPTZ NOT NULL,
  choices    JSONB NOT NULL,   -- [{label, optionIndex, quality}]
  score      JSONB NOT NULL,   -- {best: n, ok: n, harm: n, neutral: n}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE case_progress (
  user_id UUID NOT NULL, deck_id UUID NOT NULL,
  last_result TEXT NOT NULL,          -- 'clean' | 'flawed' | 'harmful'
  due_at TIMESTAMPTZ NOT NULL,
  runs INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deck_id)
);
```

`POST /api/play/complete {eventId, deckId, startedAt, endedAt, choices}` — server
computes score + result (`harm>0 → harmful; ok>0 → flawed; else clean`), inserts
(idempotent on eventId), upserts `case_progress` with revisit schedule:
**harmful → due in 1 day; flawed → 3 days; clean → 14 days** (constants, one place,
shared). Offline: Android queues completion in the existing outbox mechanism.

## Shared logic

Scoring + result + revisit-interval functions in `packages/shared` (TS + Kotlin parity).

## Android

- Play completion screen: score summary (choices made, quality tally), per-choice recap
  with the harmful ones highlighted, "again" button.
- Deck list: case decks show due state ("Case due") from `case_progress`, replacing the
  current stateless "Play" affordance when due.
- **Spec 01 synergy (do it):** a `[harm]` option may ALSO carry a route to a remediation
  label — syntax `- text -> target [harm]` already routes; when the target's card exists
  in a companion SR deck this is out of scope (same-deck only, and branch decks contain
  no SR cards) — so v1: harmful choices show the _option's own node_ as normal; the recap
  screen lists harmful choices with their node text as the teaching moment.

## Constraints / non-goals

No narrative state (inventory/flags/weighted routing) — quality markers and scoring only.
No mixing SR cards into branch decks (the Spec 01 relaxation covers diagnostic cards in
SR decks; branch decks stay pure). No leaderboards.

## Acceptance criteria

1. Corpus: markers parse identically TS/Kotlin; markerless branch decks unchanged.
2. Completing a run with one harm choice → `path_events` row, `case_progress` =
   harmful/due tomorrow; replaying the same `eventId` (sync retry) inserts nothing.
3. Clean run → due in 14 days; deck list shows due state on/after due date.
4. Offline run completion syncs later and lands identically (idempotency test).
5. Scoring parity: same choices → same score/result in TS and Kotlin fixtures.

## Tests

Shared scoring fixtures (both ports); server complete-endpoint idempotency + schedule
matrix; Android ViewModel: recap correctness, outbox queuing offline.
