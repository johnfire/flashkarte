# Official decks (app-wide, shared, subscribe-based)

Status: implemented. Validated with Chris in chat before building; this doc
records the agreed design.

## Problem

Chris wants decks that belong to flashkarte itself rather than to his personal
account — e.g. the German-for-Arabic-speakers CEFR series — visible to every
user, editable only by the app, and appearing separately from a user's own
decks until they opt in.

## Data model

- A dedicated **system account** (`role = 'system'`, fixed id
  `00000000-0000-4000-8000-000000000000`) owns official decks and their cards.
  Login rejects `role = 'system'` outright — it exists only as an ownership
  anchor, never a real session.
- `decks.is_official boolean default false` marks a deck as app-owned.
- `deck_subscriptions (user_id, deck_id, created_at)` — a per-user join row.
  A user "has" an official deck once they subscribe; unsubscribing just
  removes the row. No card data is copied either way.

## Access control

Every read path a normal user hits already filtered on deck/card ownership
(`user_id = $1`). Each of those got an `OR` clause added:

```
user_id = $1
  OR (is_official AND EXISTS (SELECT 1 FROM deck_subscriptions
                               WHERE deck_id = decks.id AND user_id = $1))
```

Touched: `listDecksWithCounts`, `getDeck`, `getCards` (decks.repository.ts);
`getDueAndNewCards`, `getSenseCardsForWords`, `cardBelongsToUser`,
`getOwnedCardIds` (study.repository.ts).

Mutation paths (rename, delete, share, speech, append-cards) are
**unchanged** — still strict `user_id = $1` ownership. Since a normal user's
id never matches the system account, official decks are naturally read-only
to everyone but the system account, with no separate "block this edit"
branch to write or forget.

`card_progress` was already keyed by `(user_id, card_id)` independent of
deck ownership, so any number of users can study the same official cards
with fully independent SM-2-successor scheduling — no per-user copies.

## API

- `GET /decks` — unchanged shape, now also includes official decks the
  caller has subscribed to (`is_official: true` in the response).
- `GET /decks/official` — official decks the caller has **not** subscribed
  to yet (the "browse" list).
- `POST /decks/:id/subscribe` — adds the deck to the caller's list.
- `DELETE /decks/:id/subscribe` — removes it (progress is untouched, so
  resubscribing picks up where they left off).
- `POST /admin/decks/:id/promote-official` — reassigns a deck **and its
  cards** to the system account and sets `is_official = true`. Reassigning
  card ownership too matters: otherwise those cards would still count as the
  original owner's for account deletion/data export, and deleting that
  account would cascade-delete the "official" content.
- `POST /admin/decks/:id/demote-official` (body `{ ownerId }`) — the
  reverse, for correcting a mistake. Also deletes any subscriptions, since
  they'd otherwise be meaningless dead rows once `is_official` is false.

## UI

`DeckListPage` renders the caller's own list as today, then an "Official
decks" section below it listing anything from `/decks/official` with an Add
button. Subscribing moves it into the main list on the next load. A
subscribed official deck shows a "Remove" action instead of
rename/delete/share/speech controls (those would silently no-op against a
system-owned deck since the ownership check would just fail).

## Rollout of the six existing CEFR decks

Those six decks were created under Chris's own account before this feature
existed. Once this ships to production, promote each via
`POST /admin/decks/:id/promote-official` (Chris's admin JWT) rather than
touching the database directly — it's the same code path a future official
deck goes through, and it's reversible via demote if anything looks wrong.

## Explicitly out of scope

- Android app grouping (it will keep working — the API just includes
  official decks as part of the same list — but it won't visually separate
  them until someone updates the Android UI too).
- Per-user speech overrides on an official deck (the admin sets sensible
  defaults at promote time; individual users can't override yet).
- Any admin *UI* button for promote/demote — the endpoint is there; a web
  admin-page control can follow if this gets used often enough to want one.
