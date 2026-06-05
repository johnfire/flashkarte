# Card series — ordered decks (#3, slice 1) — Design

_Date: 2026-06-05 · Scope: Server + Android · Slice 1 of #3 (series only; branching deferred)_

## Goal

Deliver the "get it right → unlock the next" value of #3 as a lean first slice: a
deck can be marked **Study in order**. In that mode the learner must answer the
current card correctly (rating ≥ 3, or a correct choice in MC mode) before the
next card is reached — turning a deck into a guided sequence. True branching
(next card depends on which answer) and the JSON-content/card-relations data
model are deferred to a later pass.

## Why this slice

The full #3 (card `type` + JSON content + card relations + sequence-aware SM-2 +
parser changes across 3 ports + branching UI) is a multi-session epic. This slice
captures the core sequencing value with **no parser changes** and **no SM-2
changes** — authoring is a per-deck toggle, and the behavior is enforced in the
study engine. Cards already carry a `position`, so ordering is free.

## Architecture

### Server (`packages/server`)

- **Migration 009** (`009_deck_is_ordered.sql`):
  `ALTER TABLE decks ADD COLUMN is_ordered boolean NOT NULL DEFAULT false;`
- **`decks.repository.ts`:** add `is_ordered` to `DeckRow` and the `DECK_COLS`
  constant (so `createDeck`/`getDeck`/`renameDeck`/`setDeckPublic` all return it),
  add `d.is_ordered` to the `listDecksWithCounts` SELECT, and add
  `setDeckOrdered(userId, id, isOrdered)` (mirrors `setDeckPublic`).
- **`decks.service.ts` `update`:** accept `isOrdered?: unknown`; validate it's a
  boolean; call `repo.setDeckOrdered`.
- **`decks.controller.ts` `update`:** forward `isOrdered: req.body.isOrdered`.
- The deck list + detail responses now carry `is_ordered` (snake_case JSON).

### Android

- **DTOs:** `DeckListItemDto` + `DeckDetailDto` gain
  `@SerialName("is_ordered") val isOrdered: Boolean = false`; `UpdateDeckRequest`
  gains `val isOrdered: Boolean? = null`.
- **`Deck` model:** gains `val isOrdered: Boolean = false`.
- **`DeckRepository`:** map `isOrdered` in both the list mapper (`toDomain`) and
  the `getDeckById` detail mapping; add `setOrdered(id, isOrdered)` →
  `updateDeck(UpdateDeckRequest(isOrdered = …))` + `refresh()`.
- **Deck ⋮ menu (`DeckListScreen`):** add a **Study in order / Unordered** item
  (label reflects `deck.isOrdered`) → `viewModel.setOrdered(id, !isOrdered)`.
  `DeckListViewModel.setOrdered` delegates to the repo.
- **`StudyViewModel`:** read `deck.isOrdered` in `init` into a private `ordered`
  flag. In `applyAndAdvance`, when `rating < 3` re-queue the current card at the
  **front** (`queue.addFirst`) for ordered decks instead of the back — so the
  same card repeats until passed and the next never unlocks early. Unordered
  decks keep the existing "re-queue at end" behavior. (MC wrong answers grade 1,
  so they flow through the same gate.)

## Known limitation (acceptable for the slice)

The study batch endpoint returns due+new cards ordered new-first then by
`position`; it does not expose `position` to the client, so for a
partially-reviewed ordered deck the _initial_ order follows the server's grouping
rather than strict global position. The must-pass-to-advance gate still holds
(you can't skip ahead past a card you haven't passed). Strict global position
ordering for ordered decks is a future refinement (server-side study ordering).

## Testing

- **Server:** extend `decks.routes.test.ts` — `PATCH /api/decks/:id` forwards
  `isOrdered` to `service.update`; a service guard rejects a non-boolean
  `isOrdered`.
- **Android:** `StudyViewModel` — ordered deck: a wrong rating keeps the SAME card
  current (doesn't advance); unordered deck: a wrong rating advances to the next
  card (existing behavior). `DeckListViewModel.setOrdered` delegates to the repo.
- `compileDebugKotlin` + full Android unit suite green; server suite green.

## Out of scope (later passes of #3)

- Branching (answer-dependent next card), card `type`/JSON-content data model,
  card relations, sequence-aware SM-2 scheduling, authored series via Markdown
  syntax, web support.
