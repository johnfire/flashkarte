# Ordered decks — strict global order (#3, slice 2) — Design

_Date: 2026-06-06 · Scope: Server only · Slice 2 of #3 (refines slice 1: ordered decks)_

## Goal

Close the known limitation from slice 1: a deck marked **Study in order** must
study its cards in strict global `position` order, even when partially reviewed.
Today the study batch groups cards by reviewed-vs-new and `due_at`, with
`position` only as a final tiebreaker, so the _initial_ order of an ordered deck
can diverge from authored position.

## Background

`getDueAndNewCards` (study.repository.ts) selects due + new cards with:

```sql
ORDER BY (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
```

The must-pass-to-advance gate (slice 1, enforced client-side in `StudyViewModel`)
already prevents skipping ahead past an unpassed card. The only gap is the order
of the returned set for ordered decks. This slice makes the server return that
set in strict `position` order.

## Architecture (Approach A — server-side ordering)

Single change in `getDueAndNewCards`: join `decks` and, when `d.is_ordered`,
sort strictly by `c.position`. The unordered path is byte-for-byte unchanged.

```sql
SELECT c.id, c.content, c.category
FROM cards c
JOIN decks d ON d.id = c.deck_id
LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
WHERE c.deck_id = $2 AND c.user_id = $1
  AND (p.id IS NULL OR p.due_at <= now())
ORDER BY
  CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,
  (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
LIMIT $3
```

- For an **ordered** deck, the `CASE` yields each card's `position`, so the
  primary sort key is global position; the remaining keys never break a tie
  because `position` is per-deck monotonic.
- For an **unordered** deck, the `CASE` yields `NULL` for every row, so the
  leading sort key is inert and the existing ordering applies exactly as before.

No service, controller, DTO, client, or other-port changes. The deck filter
(`c.deck_id = $2`) means the added `JOIN decks` matches exactly one deck row and
adds no rows or duplicates.

## Why not the alternatives

- **Fetch `is_ordered` in the service, pass a boolean param** — same result but
  an extra `getDeck` round trip and more plumbing for no benefit.
- **Expose `position` to the client, sort on Android** — touches all three ports
  for what the server does in one place; the slice-1 gate already lives
  client-side, so only the initial order needs fixing. YAGNI.

## Scope clarification (acceptable)

The batch still filters to due + new cards. A previously-passed card that is not
yet due is excluded from the batch; this is correct — you don't re-study a card
you've already passed and that isn't due. Strict ordering governs the order of
the cards that _are_ returned, which is what the limitation was about.

## Testing

The existing server suite mocks the DB, so SQL ordering can't be verified there.
Add a scratch-DB SQL test (mirrors slice-1's migration validation style):

1. Create a throwaway DB, apply migrations `001`..`009`.
2. Seed one user, two decks (`is_ordered = true` and `false`), and cards at
   positions `0,1,2,3` in each; mark the position-`1` card reviewed with a
   future `due_at` (so it's filtered out) and the position-`0` card reviewed and
   due (so it's included).
3. Assert the **ordered** deck returns the included cards in strict ascending
   `position` order (`0, 2, 3`), and the **unordered** deck returns the
   reviewed-first / `due_at` grouping (existing behavior) unchanged.

Plus run the full server suite (`npm test`) to confirm no regression in the
mocked study/decks tests.

## Out of scope (later passes of #3)

Branching (answer-dependent next card), card `type`/JSON-content authoring,
card relations / prerequisite unlock, sequence-aware SM-2, web support.
