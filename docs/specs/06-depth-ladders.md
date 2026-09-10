# 06 — Depth ladders (stability-gated deeper learning)

**Priority:** 6 · **Effort:** ~1 week · **Scope:** shared parser + server queue + Android/web display

## Goal

Cards on the same concept exist at explicit depth tiers (recognize → recall → apply →
explain). Deeper tiers stay locked until the shallower tier on that concept is stable.
The deck grows downward as you learn.

## Markdown contract (parser change — TS + Kotlin + corpus)

Tag lines immediately above a card front (order-insensitive, both optional):

```markdown
@concept backprop
@depth 2
**7. State the chain rule as used in backpropagation.**
…
```

- `@depth N` (1–4, default 1). `@concept slug` (same charset as labels). A card with
  `@depth > 1` and no `@concept` is a **422 at upload** (there is nothing to gate on).
- Stored as `content.depth` (int) and `content.concept` (string|null). Absent tags →
  depth 1, concept null — all existing decks unchanged.

## Gating rule (server, `study.repository.getDueAndNewCards`)

A card at depth N+1 of concept C enters the queue only when **every** card of concept C
at depth ≤ N (in the same deck) is **stable**, meaning `repetitions >= STABLE_REPS`
(`packages/shared/src/study/senses.ts`, mirrored in Kotlin `domain/senses/Senses.kt`).
Locked cards are excluded from `due`/`new` counts but shown in deck stats as `locked`.
Depth-1 and concept-less cards are never gated.

> **Amended 2026-09-10.** This spec originally gated on `interval_days >= 7`
> (`STABLE_DAYS`). That threshold became unreachable when the fixed-cadence scheduler
> landed (`7833a91`): Hard is always 1 day and Good always 2, so only repeated Easy ever
> exceeds 7 days and an honest Good-presser would never unlock a single depth tier.
> `interval_days` no longer measures stability at all — it restates which button was last
> pressed. `repetitions` resets on a lapse and is otherwise independent of both the rating
> and the scheduler. `STABLE_REPS` is already defined and tested (spec 10 shipped it);
> reuse it rather than declaring a second constant.

Implementation note: single additional query per study-session build (concept → min
interval per depth), computed server-side; Android offline uses the same rule via a
shared TS/Kotlin function against its local store — put the gate logic in
`packages/shared` per the shared-logic guardrail, parameterized by a
`(concept, depth) → minInterval` map each client assembles from its own store.

## Display

- Deck stats gain `locked` count (server + web chips + Android stats).
- Study card shows a subtle depth indicator (e.g. "Depth 2/4") when depth > 1.
- Deck detail (web + Android): locked cards visible but marked (no cliff-hanger UX).

## Constraints / non-goals

- No cross-deck concepts (same-deck only, v1). No UI for editing depth (markdown is the
  editor). No unlock notifications (the queue simply grows — v2 could notify).
- MCP: update authoring tool descriptions with the syntax (one paragraph + example,
  including "write tier 2–4 cards for concept X" as the intended AI workflow).

## Acceptance criteria

1. Corpus: tags parse identically TS/Kotlin; untagged decks byte-identical to today.
2. Upload with `@depth 3` + no concept → 422 naming the card.
3. Deck with concept "backprop" depths 1–3: initially only depth-1 in queue; set depth-1
   `repetitions = STABLE_REPS` → depth-2 appears; depth-3 still locked (test at repository
   level).
4. Locked count correct in stats; offline Android gates identically (shared-function
   parity test).
5. Mixed deck (tagged + untagged cards): untagged cards flow exactly as before.

## Tests

Shared: parser + gate function (both ports, incl. the boundary at
`repetitions` = STABLE_REPS - 1 vs STABLE_REPS).
Server: repository gating matrix. Android: local queue build honors gate offline.
