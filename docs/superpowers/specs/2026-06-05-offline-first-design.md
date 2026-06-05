# Offline-first support with background sync — Design

_Date: 2026-06-05 · Issue: #1 · Scope: Android (v1)_

## Goal

Let users study flashkarte decks with no network connection and have their
review progress sync to the server when connectivity returns. Android is the
target surface for v1. Web offline (PWA/IndexedDB) is explicitly **out of scope**
for this iteration.

## Background / current behaviour

Today the Android client is online-only and server-authoritative:

- `GET /api/decks/{id}/study` returns due cards with placeholder progress.
- Each rating fires `POST /api/study/review` (`{ card_id, rating }`); the server
  computes SM-2 from the previous `card_progress` row and stamps `now()`.
- `DeckRepository` caches the deck list in an in-memory `MutableStateFlow`; there
  is no on-device database (only DataStore for session + theme prefs).
- An unused local SM-2 port already exists at
  `android/app/src/main/java/com/flashmd/domain/sm2/Sm2Algorithm.kt`.

Two properties of the current `/review` endpoint make it unsafe as a sync target:

1. **Not replay-safe.** It recomputes SM-2 from prior state on every call, so
   replaying the same queued rating twice double-applies the algorithm.
2. **No client timestamp.** It always uses `now()`, so a review performed offline
   yesterday would be dated at sync time.

The sync path is therefore designed around **event IDs** (idempotency) and
**client-supplied timestamps** (correct dating + ordering).

## Architecture overview

```
Study (offline-capable)
  └─ StudyRepository
       ├─ reads/writes LOCAL card_progress (SQLDelight)
       ├─ computes SM-2 locally (Sm2Algorithm.kt)
       └─ appends a review event to the LOCAL outbox

SyncWorker (WorkManager)
  └─ on reconnect / app foreground, with backoff:
       POST /api/study/sync  { events: [{event_id, card_id, rating, reviewed_at}] }
       ← { progress: [{card_id, easiness, interval, repetitions, due_at, last_rating}] }
       ├─ server dedupes by event_id, applies in reviewed_at order
       ├─ client overwrites local card_progress with returned authoritative state
       └─ client deletes the acknowledged outbox rows
```

Server remains the source of truth for SM-2. Clients compute SM-2 locally only to
drive the offline study session; on sync the server's recomputed result wins and
overwrites the local copy.

## Local store (SQLDelight)

New dependency: SQLDelight (Android driver + coroutines extensions), wired through
Hilt in a new `DatabaseModule`. Four tables:

- **decks** — snapshot for offline browsing: `id, title, source_file, created_at,
last_studied, total_cards`. (`due_count` is derived locally from `card_progress`,
  not stored.)
- **cards** — `id, deck_id, front, back, category, position`.
- **card_progress** — local SM-2 state mirroring the server row: `card_id (PK),
easiness, interval_days, repetitions, due_at, last_reviewed_at, last_rating`.
- **outbox** — pending review events: `event_id (PK, UUID), card_id, rating,
reviewed_at, created_at`.

Caching strategy: when a deck is opened (or its study screen entered) **while
online**, its cards and current progress are written into SQLDelight. There is no
bulk "download everything" in v1 — a deck becomes available offline once it has
been opened online at least once. The deck **list** continues to be cached in
memory/refreshed online as today; offline, the list is read from the `decks`
table.

## Offline study flow

1. Study screen loads due cards from SQLDelight: cards whose local `card_progress`
   is null (new) or `due_at <= now`, matching the server's ordering (new-first,
   then due date, then position).
2. On a rating (1/3/4/5):
   - Compute next SM-2 state locally via `Sm2Algorithm.calculate(prev, rating)`.
   - Upsert the local `card_progress` row (`last_rating`, `due_at`, etc.).
   - Insert an outbox row `{ event_id = random UUID, card_id, rating,
reviewed_at = now }`.
   - Update the UI immediately (re-queue if rating < 3, matching current behaviour).
3. Trigger a sync attempt opportunistically (enqueue the `SyncWorker`); it no-ops
   gracefully when offline.

## Sync engine

### New endpoint: `POST /api/study/sync`

Request:

```json
{
  "events": [
    {
      "event_id": "uuid",
      "card_id": "uuid",
      "rating": 4,
      "reviewed_at": "ISO-8601"
    }
  ]
}
```

Server behaviour (`study.service.ts` / `study.repository.ts`):

1. Validate each event (`rating` ∈ 1–5, `card_id` belongs to the user, valid
   timestamp). Invalid events are reported per-event, not failing the whole batch.
2. **Dedupe**: skip any `event_id` already present in the new `review_events`
   table (idempotent — safe to replay the whole batch).
3. **Order**: apply remaining events per card in `reviewed_at` ascending order,
   feeding each result into the next (SM-2 is sequential). Use `reviewed_at` for
   `last_reviewed_at` and as the base for `due_at = reviewed_at + interval days`.
4. Record each applied event in `review_events` and upsert `card_progress`
   (existing `ON CONFLICT (user_id, card_id)` upsert).
5. Return the authoritative `card_progress` for every card touched by the batch.

Response:

```json
{
  "progress": [
    {
      "card_id": "uuid",
      "easiness": 2.5,
      "interval": 6,
      "repetitions": 2,
      "due_at": "ISO-8601",
      "last_rating": 4
    }
  ]
}
```

### Migration 008 — `review_events`

```sql
CREATE TABLE review_events (
  event_id   uuid PRIMARY KEY,
  user_id    uuid NOT NULL,
  card_id    uuid NOT NULL,
  rating     int  NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX review_events_user_card_idx ON review_events (user_id, card_id);
```

This table is the idempotency ledger and a review audit log. `event_id` is the
client-generated UUID; the `PRIMARY KEY` makes duplicate replays a no-op.

### Conflict policy

Last-write-wins per card, keyed on `reviewed_at`. This is safe because reviews of a
single card are monotonic in time and SM-2 is a pure function of the rating
sequence. If two devices review the same card offline, applying both in timestamp
order yields a deterministic result; the later review's resulting state is what
persists.

### Background scheduling (WorkManager)

- A `SyncWorker` enqueued with a `NetworkType.CONNECTED` constraint.
- Triggered on: app foreground, after each offline rating, and on connectivity
  regained.
- Exponential backoff on failure (WorkManager default policy).
- Coalesce: a single unique work name so overlapping triggers don't stack.

The existing `POST /api/study/review` endpoint is retained for the simple online
path (immediate single-rating submit); `/sync` is used by the outbox drain. Both
write through the same service logic so SM-2 behaviour stays identical.

## Sync status UI

A small status indicator (e.g. a chip on the deck list / study screen) reflecting
outbox state derived from SQLDelight:

- `N pending` — outbox non-empty, not currently syncing.
- `Syncing…` — worker running.
- `Synced` — outbox empty.
- `Sync failed — Retry` — last attempt failed; tapping enqueues the worker again.

## Out of scope (v1)

- Web offline / PWA / IndexedDB.
- Offline **creation** of decks, offline AI/MCP generation, offline library browse
  or clone — these remain always-online.
- Bulk "download all decks for offline" — only opened decks are cached.
- Cross-device conflict UI beyond last-write-wins.

## Testing

- **Shared** (`packages/shared`): SM-2 unchanged; existing Jest tests stand.
- **Server** (`packages/server`): new Jest tests for `/api/study/sync` —
  (a) duplicate `event_id` is a no-op, (b) out-of-order events applied in
  `reviewed_at` order produce the same state as in-order, (c) per-event validation
  errors don't fail the batch, (d) returned progress matches a single-shot
  `/review` for an equivalent sequence.
- **Android**: unit tests for the outbox repository (enqueue, drain, dedupe-on-ack)
  and the local SM-2 study path (offline rating updates local progress + outbox);
  `compileDebugKotlin` stays green.

## Rollout

1. Migration 008 + `/api/study/sync` (server, behind no flag — additive).
2. SQLDelight scaffolding + local mirrors of decks/cards/progress (Android).
3. Outbox + offline study path (Android).
4. SyncWorker + status UI (Android).
5. Ship server first (backward-compatible), then the Android release via the
   existing Play internal pipeline.
