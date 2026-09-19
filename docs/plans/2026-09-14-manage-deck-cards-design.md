# Browse & edit cards in a deck — design

**Date:** 2026-09-14

## Problem

There's no way to see every card in a deck (Study only shows one at a time, in
SR-queue order; the public preview shows fronts only) or to edit an existing
card. `create_deck`/`add_cards` are the only ways to get card content in —
confirmed painfully earlier this session, when adding schematic images to
Ch.1's already-studied cards required a full delete-and-recreate that reset
real study progress.

## Decisions (from brainstorming)

1. **Entry point:** a new "Manage" button on each deck in the deck list, next
   to Study/Share/Delete, opening `/decks/:id/cards`.
2. **Scope:** full editing for every card shape — basic, diagnostic (basic +
   routed options), branch, and sense cards — not just plain front/back.
3. **Structural fields:** branch/diagnostic option targets are freely
   re-typeable (validated against the deck's real labels before saving).
   Sense `index`/`count` are **not** raw-editable — they describe a card's
   position in a chain of siblings sharing a word, and editing one card's
   copy independently can desync the whole chain. Reordering is instead a
   dedicated atomic operation over all siblings at once.
4. Reuses `validateBranching`/`validateSenses` (the same functions
   `create_deck`/`add_cards` already call) rather than reimplementing
   deck-consistency rules.

## Backend

### `PATCH /api/decks/:id/cards/:cardId` — single-card edit

1. `repo.getDeck(userId, deckId)` for ownership (404 otherwise).
2. Fetch the deck's full current card set; splice in the proposed edit for
   the target card, in memory.
3. Run `validateBranching(fullSet)` and `validateSenses(fullSet)` against the
   _whole_ updated set (not just the edited card) — same rejection messages
   the create/add-cards flows already produce (duplicate label, dangling
   option target, split sense word) if the edit breaks deck consistency.
4. Persist just that card's `content`. Audit log `card.updated` (actor,
   correlation ID, before/after diff) via the existing `auditFromRequest`
   pattern.

Editable fields depend on the card's actual shape (inferred from its content,
not a manual type selector): basic → front/back/category; diagnostic → front,
back, options (text + target); branch → front, options (text + target); sense
→ word/context/hint (index/count untouched here).

### `PATCH /api/decks/:id/senses/:word/reorder` — atomic sibling reorder

Body: the sibling cards' IDs in the new order. Loads all cards sharing that
`sense.word`; rejects if the ID set doesn't exactly match the existing
siblings (no silent drop/add). Rewrites `index` (0..N−1) and `count` for all
of them in one transaction. Audit log `deck.senses_reordered`.

## Frontend

- `ManageDeckCardsPage` (`/decks/:id/cards`): fetches via the existing
  `GET /api/decks/:id` (already returns full card content for the owner —
  same endpoint `get_deck` uses over MCP). Lists front/prompt, category, a
  type badge for sense/branch/diagnostic cards; click → `/decks/:id/cards/:cardId`.
- `EditCardPage`: form shape driven by the card's content shape.
  - Basic: front, back (`<textarea>`, `CardText` preview underneath so an
    image reference's render is visible), category (free-text, suggested
    from the deck's existing categories).
  - Diagnostic: front, back, options list (text + target select: "✓ correct"
    or another label in the deck).
  - Branch: front (the node's prompt), options list (text + target select:
    a label or the reserved `end`).
  - Sense: word/context/hint text fields; index/count shown read-only
    ("meaning 2 of 3"); a link to `SenseReorderPage` for that word.
  - Save → `PATCH .../cards/:cardId`; server validation errors surface as a
    form-level banner.
- `SenseReorderPage`: drag-sortable list of one word's sibling cards, saves
  via the reorder endpoint.
- `DeckListItem`: new "Manage" button.

## MCP

- `update_card` (deck_id, card_id, + optional front/back/category/options/
  sense fields) and `reorder_senses` (deck_id, word, ordered card_id list) —
  thin wrappers over the same two endpoints, same validation/errors. Closes
  the gap that forced today's delete-and-recreate.

## Testing

- Integration tests for both endpoints against real Postgres: ownership, and
  every rejection case (dangling target, duplicate label, split word,
  mismatched reorder set).
- Component tests per edit-form shape and the list/reorder pages.
- One e2e test covering edit-a-card end to end.

## Rollout order

Backend (validators reuse → service → repository → controller/routes →
audit) → backend tests → frontend (list → edit forms → reorder page → wire
the button in) → frontend tests → MCP tools + doc updates → e2e test → full
suite + typecheck + lint + format → one commit, then ask if there's another
task (per the new standing build workflow).
