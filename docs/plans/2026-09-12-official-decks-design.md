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

`DeckListPage` renders the caller's own list as today; a subscribed official
deck shows a "Remove" action instead of rename/delete/share/speech controls
(those would silently no-op against a system-owned deck since the ownership
check would just fail). Browsing/adding official decks moved to a dedicated
page — see the addendum below.

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
- Any admin _UI_ button for promote/demote — the endpoint is there; a web
  admin-page control can follow if this gets used often enough to want one.

---

## Addendum (same day): collections, for scale

Chris expects "hundreds, probably thousands" of official decks eventually. A
flat "Official Decks" list (the original inline section on `DeckListPage`)
doesn't hold up at that volume, so it was replaced with a dedicated **App
Decks** area before any real volume existed.

### Data model

- `deck_collections (id, title citext unique, description, created_at,
updated_at)` — `citext` for forgiving, case-insensitive title matching
  (same type `users.email` already uses).
- `decks.collection_id` (nullable FK, `ON DELETE SET NULL`) — a deck belongs
  to at most one collection; null means standalone.
- `decks.collection_position` (nullable int) — append-only ordering within
  a collection, assigned at promote time. No manual reorder UI.
- "Subscribe to a whole collection" needed no new state: it's a bulk insert
  into the existing `deck_subscriptions` table for whatever's in the
  collection _right now_ — not a standing "auto-add future members" rule.

### API

- `GET /decks/official/collections?q=&limit=&offset=` — paginated,
  searchable collections list: `{id, title, description, deck_count}`.
- `GET /decks/official/collections/:id?q=&limit=&offset=` — one
  collection's member decks, paginated/searchable, each flagging whether
  the caller is subscribed.
- `GET /decks/official?q=&limit=&offset=` — standalone official decks (no
  collection), now paginated/searchable instead of returning everything.
- `POST /decks/official/collections/:id/subscribe-all` — bulk-subscribes
  every deck currently in the collection.
- `promote-official` gained an optional `collectionTitle`: `undefined`
  leaves collection membership untouched (idempotent re-promotion), `null`
  detaches, a string finds-or-creates the collection and appends the deck
  at the end of its ordering.
- Pagination is plain `limit`/`offset`, not cursor-based — at "thousands,"
  offset pagination on an indexed, searched query is fine in Postgres, and
  it's simpler than keyset pagination. Worth revisiting only past
  six-figure row counts.
- A key change from the original design: `/decks/official` and the
  collection-detail endpoint no longer hide decks the caller already
  subscribed to — they flag `subscribed: true` instead. Hiding them made
  sense for a small unpaginated list; at scale it means items silently
  disappear out from under a paginated scroll, which is worse than just
  showing "Added."

### UI

- `/app-decks` — search box, a paginated **Collections** section (each row
  links into the collection and has a bulk "Add all"), and a paginated
  **Other Official Decks** section for standalone decks. Search filters
  both sections by title; it does not reach inside collections to find a
  buried deck by name — that requires opening the collection first, since
  no endpoint searches across every deck regardless of collection.
  Deliberately out of scope for now; add a cross-collection search
  endpoint later if browsing turns out too shallow.
- `/app-decks/:id` — one collection's title/description, its own "Add all"
  and search box, and its paginated deck list.
- `DeckListPage` lost its inline "Official Decks" section entirely — the
  header link that was "Library" now has an "App Decks" link next to it.
  "My Decks" itself (subscribed decks, badge, Remove) is unchanged.
- New shared pieces: `usePaginatedList` (search + "load more" pagination,
  used by all three browse lists), `OfficialDeckRow` (a deck row with an
  Add/Added button), `CollectionRow` (a collection row with its own bulk
  Add all).

### Rollout

The six CEFR decks were promoted without a `collectionTitle` in the first
pass (before this addendum), so they're currently standalone. Once this
ships, re-run `promote-official` on all six with
`collectionTitle: "German for Arabic Speakers"` — idempotent, and it moves
them into a proper collection without touching ownership/`is_official`
(both already set).
