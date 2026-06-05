# Offline-first Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the flashkarte Android app study decks offline and sync review progress to the server when connectivity returns, via an idempotent, timestamped batch sync endpoint.

**Architecture:** The Android client gains a SQLDelight local store (decks, cards, card_progress, outbox). Studying computes SM-2 locally and appends review events to an outbox. A WorkManager job drains the outbox to a new `POST /api/study/sync` endpoint, which dedupes by `event_id`, applies events in `reviewed_at` order, and returns authoritative progress that overwrites the local copy. Server stays the SM-2 source of truth.

**Tech Stack:** Server — Express + TypeScript + Postgres, Jest. Android — Kotlin/Compose, Hilt, Retrofit, SQLDelight 2.0.2, WorkManager. Shared SM-2 unchanged.

**Spec:** docs/superpowers/specs/2026-06-05-offline-first-design.md

---

## File Structure

**Server (`packages/server`)**

- Create: `src/db/migrations/008_review_events.sql` — idempotency ledger table.
- Modify: `src/domains/study/study.repository.ts` — add `insertReviewEvent`, `upsertProgressAt`.
- Modify: `src/domains/study/study.service.ts` — add `sync()`.
- Modify: `src/domains/study/study.controller.ts` — add `sync` handler.
- Modify: `src/domains/study/study.routes.ts` — wire `POST /sync`.
- Create: `src/domains/study/study.service.test.ts` — sync dedupe/ordering tests (mocks repo).
- Modify: `src/domains/study/study.routes.test.ts` — add `/sync` route test.

**Android (`android/app`)**

- Modify: `gradle/libs.versions.toml`, `build.gradle.kts` (root), `app/build.gradle.kts` — add SQLDelight + WorkManager + Hilt-Work.
- Create: `app/src/main/sqldelight/com/flashmd/db/{Decks,Cards,CardProgress,Outbox}.sq`.
- Create: `app/src/main/java/com/flashmd/data/local/db/DatabaseModule.kt`.
- Create: `app/src/main/java/com/flashmd/data/local/EventFactory.kt`.
- Create: `app/src/main/java/com/flashmd/data/repository/OutboxRepository.kt`.
- Create: `app/src/main/java/com/flashmd/data/local/LocalStudyStore.kt`.
- Modify: `app/src/main/java/com/flashmd/data/repository/StudyRepository.kt`, `DeckRepository.kt`.
- Create: `app/src/main/java/com/flashmd/data/remote/dto/SyncDtos.kt`; modify `FlashkarteApi.kt`.
- Create: `app/src/main/java/com/flashmd/sync/SyncWorker.kt`, `SyncScheduler.kt`.
- Modify: `app/src/main/java/com/flashmd/FlashMdApp.kt` (Configuration.Provider).
- Create: `app/src/main/java/com/flashmd/ui/components/SyncStatusChip.kt`; wire into deck list.
- Create tests under `app/src/test/java/com/flashmd/{db,sync,remote}/`.

---

# Phase 1 — Server: `POST /api/study/sync`

### Task 1: Migration 008 — `review_events`

**Files:**

- Create: `packages/server/src/db/migrations/008_review_events.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 008_review_events.sql
-- Idempotency ledger + audit log for offline review sync.
CREATE TABLE IF NOT EXISTS review_events (
  event_id    uuid PRIMARY KEY,
  user_id     uuid NOT NULL,
  card_id     uuid NOT NULL,
  rating      int  NOT NULL,
  reviewed_at timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_events_user_card_idx
  ON review_events (user_id, card_id);
```

- [ ] **Step 2: Verify it applies**

Run: `cd packages/server && npm run build && node dist/db/migrate.js`
Expected: exits 0; `\d review_events` in psql shows the table. (Local dev DB only — prod applies on deploy.)

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/db/migrations/008_review_events.sql
git commit -m "feat(server): migration 008 review_events ledger for offline sync (#1)"
```

---

### Task 2: Repository — `insertReviewEvent` + `upsertProgressAt`

**Files:**

- Modify: `packages/server/src/domains/study/study.repository.ts`

- [ ] **Step 1: Add `insertReviewEvent` (append to the file)**

```ts
export async function insertReviewEvent(
  userId: string,
  ev: {
    event_id: string;
    card_id: string;
    rating: number;
    reviewed_at: string;
  },
): Promise<boolean> {
  const rows = await query<{ event_id: string }>(
    `INSERT INTO review_events (event_id, user_id, card_id, rating, reviewed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [ev.event_id, userId, ev.card_id, ev.rating, ev.reviewed_at],
  );
  return rows.length > 0;
}
```

- [ ] **Step 2: Add `upsertProgressAt` (append to the file)**

This mirrors `upsertProgress` but takes an explicit `lastReviewedAt`/`dueAt` instead of `now()`, so a review performed offline keeps its real date.

```ts
export function upsertProgressAt(
  userId: string,
  cardId: string,
  s: {
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: Date;
    lastRating: number;
    lastReviewedAt: Date;
  },
) {
  return query(
    `INSERT INTO card_progress
       (user_id, card_id, repetitions, ease_factor, interval_days, due_at, last_rating, last_reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, card_id) DO UPDATE
       SET repetitions = EXCLUDED.repetitions, ease_factor = EXCLUDED.ease_factor,
           interval_days = EXCLUDED.interval_days, due_at = EXCLUDED.due_at,
           last_rating = EXCLUDED.last_rating,
           last_reviewed_at = EXCLUDED.last_reviewed_at, updated_at = now()`,
    [
      userId,
      cardId,
      s.repetitions,
      s.easeFactor,
      s.intervalDays,
      s.dueAt,
      s.lastRating,
      s.lastReviewedAt,
    ],
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/domains/study/study.repository.ts
git commit -m "feat(server): sync repo helpers insertReviewEvent + upsertProgressAt (#1)"
```

---

### Task 3: Service — `sync()` with dedupe + ordering (TDD)

**Files:**

- Modify: `packages/server/src/domains/study/study.service.ts`
- Test: `packages/server/src/domains/study/study.service.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// study.service.test.ts
jest.mock("./study.repository");
import * as repo from "./study.repository";
import { sync } from "./study.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.cardBelongsToUser.mockResolvedValue({ id: "c1" } as never);
  mockRepo.getProgressRow.mockResolvedValue(null as never);
  mockRepo.insertReviewEvent.mockResolvedValue(true);
  mockRepo.upsertProgressAt.mockResolvedValue(undefined as never);
});

describe("sync", () => {
  test("applies same-card events in reviewed_at order regardless of input order", async () => {
    const res = await sync("u1", [
      {
        event_id: "e2",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T10:00:00.000Z",
      },
      {
        event_id: "e1",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
    // e1 (new card, rating 4) -> interval 1, reps 1; then e2 -> interval 6, reps 2.
    const p = res.progress.find((x) => x.card_id === "c1");
    expect(p!.interval).toBe(6);
    expect(p!.repetitions).toBe(2);
    expect(res.acked_event_ids).toEqual(expect.arrayContaining(["e1", "e2"]));
  });

  test("duplicate event_id is acked but not re-applied", async () => {
    mockRepo.insertReviewEvent.mockResolvedValue(false); // already processed
    const res = await sync("u1", [
      {
        event_id: "dup",
        card_id: "c1",
        rating: 5,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
    ]);
    expect(mockRepo.upsertProgressAt).not.toHaveBeenCalled();
    expect(res.acked_event_ids).toEqual(["dup"]);
    expect(res.progress).toEqual([]);
  });

  test("invalid event is acked-and-dropped, valid events in same batch still apply", async () => {
    const res = await sync("u1", [
      {
        event_id: "bad",
        card_id: "c1",
        rating: 9,
        reviewed_at: "2026-06-05T09:00:00.000Z",
      },
      {
        event_id: "ok",
        card_id: "c1",
        rating: 4,
        reviewed_at: "2026-06-05T09:30:00.000Z",
      },
    ]);
    expect(res.acked_event_ids).toEqual(expect.arrayContaining(["bad", "ok"]));
    expect(mockRepo.upsertProgressAt).toHaveBeenCalledTimes(1);
  });

  test("rejects non-array events", async () => {
    await expect(sync("u1", { nope: true } as never)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/server && npx jest study.service -t sync`
Expected: FAIL — `sync` is not exported.

- [ ] **Step 3: Implement `sync()` (append to `study.service.ts`)**

```ts
interface SyncEvent {
  event_id: string;
  card_id: string;
  rating: number;
  reviewed_at: string;
}

function parseEvent(e: unknown): SyncEvent | null {
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  if (typeof o.event_id !== "string") return null;
  if (typeof o.card_id !== "string") return null;
  if (
    typeof o.rating !== "number" ||
    !Number.isInteger(o.rating) ||
    o.rating < 1 ||
    o.rating > 5
  ) {
    return null;
  }
  if (
    typeof o.reviewed_at !== "string" ||
    Number.isNaN(Date.parse(o.reviewed_at))
  ) {
    return null;
  }
  return {
    event_id: o.event_id,
    card_id: o.card_id,
    rating: o.rating,
    reviewed_at: o.reviewed_at,
  };
}

export async function sync(userId: string, events: unknown) {
  if (!Array.isArray(events)) {
    throw new ValidationError("events must be an array");
  }

  const acked: string[] = [];
  const valid: SyncEvent[] = [];
  for (const raw of events) {
    const ev = parseEvent(raw);
    if (ev) {
      valid.push(ev);
    } else if (
      raw &&
      typeof (raw as { event_id?: unknown }).event_id === "string"
    ) {
      // permanently invalid — ack so the client drops it from its outbox
      acked.push((raw as { event_id: string }).event_id);
    }
  }

  // Apply per card, in reviewed_at order. Stable sort by (card_id, reviewed_at).
  valid.sort((a, b) =>
    a.card_id === b.card_id
      ? a.reviewed_at.localeCompare(b.reviewed_at)
      : a.card_id.localeCompare(b.card_id),
  );

  const progressByCard = new Map<
    string,
    {
      card_id: string;
      easiness: number;
      interval: number;
      repetitions: number;
      due_at: string;
      last_rating: number;
    }
  >();
  const prevByCard = new Map<
    string,
    { easiness: number; interval: number; repetitions: number }
  >();

  for (const ev of valid) {
    const owns = await repo.cardBelongsToUser(userId, ev.card_id);
    if (!owns) {
      acked.push(ev.event_id); // not ours / gone — drop it
      continue;
    }
    const inserted = await repo.insertReviewEvent(userId, ev);
    acked.push(ev.event_id);
    if (!inserted) continue; // duplicate — already applied in a previous sync

    let prev = prevByCard.get(ev.card_id);
    if (!prev) {
      const row = await repo.getProgressRow(userId, ev.card_id);
      prev = row
        ? {
            easiness: row.ease_factor,
            interval: row.interval_days,
            repetitions: row.repetitions,
          }
        : { easiness: 2.5, interval: 0, repetitions: 0 };
    }
    const next = calculate(prev, ev.rating);
    const dueAt = new Date(
      new Date(ev.reviewed_at).getTime() + next.interval * 86400_000,
    );
    await repo.upsertProgressAt(userId, ev.card_id, {
      repetitions: next.repetitions,
      easeFactor: next.easiness,
      intervalDays: next.interval,
      dueAt,
      lastRating: ev.rating,
      lastReviewedAt: new Date(ev.reviewed_at),
    });
    prevByCard.set(ev.card_id, next);
    progressByCard.set(ev.card_id, {
      card_id: ev.card_id,
      easiness: next.easiness,
      interval: next.interval,
      repetitions: next.repetitions,
      due_at: dueAt.toISOString(),
      last_rating: ev.rating,
    });
  }

  return {
    acked_event_ids: acked,
    progress: Array.from(progressByCard.values()),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/server && npx jest study.service`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/domains/study/study.service.ts packages/server/src/domains/study/study.service.test.ts
git commit -m "feat(server): study sync service — dedupe + reviewed_at ordering (#1)"
```

---

### Task 4: Controller + route wiring + route test

**Files:**

- Modify: `packages/server/src/domains/study/study.controller.ts`
- Modify: `packages/server/src/domains/study/study.routes.ts`
- Test: `packages/server/src/domains/study/study.routes.test.ts`

- [ ] **Step 1: Write the failing route test (add inside the `describe("study routes")` block)**

```ts
test("POST /api/study/sync -> 200 with acked + progress", async () => {
  mock.sync.mockResolvedValue({
    acked_event_ids: ["e1"],
    progress: [
      {
        card_id: "c1",
        easiness: 2.5,
        interval: 1,
        repetitions: 1,
        due_at: "2026-06-06T00:00:00.000Z",
        last_rating: 4,
      },
    ],
  } as never);

  const res = await request(app)
    .post("/api/study/sync")
    .send({
      events: [
        {
          event_id: "e1",
          card_id: "c1",
          rating: 4,
          reviewed_at: "2026-06-05T09:00:00.000Z",
        },
      ],
    });

  expect(res.status).toBe(200);
  expect(res.body.acked_event_ids).toEqual(["e1"]);
  expect(mock.sync).toHaveBeenCalledWith("u1", [
    {
      event_id: "e1",
      card_id: "c1",
      rating: 4,
      reviewed_at: "2026-06-05T09:00:00.000Z",
    },
  ]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/server && npx jest study.routes -t sync`
Expected: FAIL — route 404 / `mock.sync` undefined.

- [ ] **Step 3: Add the controller handler (append to `study.controller.ts`)**

```ts
export const sync = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.sync(req.userId!, req.body.events));
});
```

- [ ] **Step 4: Wire the route (`study.routes.ts`)**

```ts
studyRouter.post("/review", ctrl.review);
studyRouter.post("/sync", ctrl.sync);
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd packages/server && npx jest study.routes`
Expected: PASS.

- [ ] **Step 6: Run the full server suite**

Run: `cd packages/server && npm test`
Expected: all green (previously 45 + new tests).

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/domains/study/study.controller.ts packages/server/src/domains/study/study.routes.ts packages/server/src/domains/study/study.routes.test.ts
git commit -m "feat(server): wire POST /api/study/sync (#1)"
```

---

# Phase 2 — Android: SQLDelight local store

### Task 5: Add SQLDelight + WorkManager + Hilt-Work to the build

**Files:**

- Modify: `android/gradle/libs.versions.toml`
- Modify: `android/build.gradle.kts` (root)
- Modify: `android/app/build.gradle.kts`

- [ ] **Step 1: Add versions/libraries/plugins to `libs.versions.toml`**

Under `[versions]`:

```toml
sqldelight = "2.0.2"
work = "2.9.1"
hiltWork = "1.2.0"
```

Under `[libraries]`:

```toml
sqldelight-android-driver = { group = "app.cash.sqldelight", name = "android-driver", version.ref = "sqldelight" }
sqldelight-coroutines = { group = "app.cash.sqldelight", name = "coroutines-extensions", version.ref = "sqldelight" }
sqldelight-primitive-adapters = { group = "app.cash.sqldelight", name = "primitive-adapters", version.ref = "sqldelight" }
sqldelight-sqlite-driver = { group = "app.cash.sqldelight", name = "sqlite-driver", version.ref = "sqldelight" }
androidx-work-runtime = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "work" }
androidx-hilt-work = { group = "androidx.hilt", name = "hilt-work", version.ref = "hiltWork" }
androidx-hilt-compiler = { group = "androidx.hilt", name = "hilt-compiler", version.ref = "hiltWork" }
```

Under `[plugins]`:

```toml
sqldelight = { id = "app.cash.sqldelight", version.ref = "sqldelight" }
```

- [ ] **Step 2: Register the SQLDelight plugin in root `build.gradle.kts`**

In the root `plugins { ... }` block, add (alongside the other `apply false` entries):

```kotlin
alias(libs.plugins.sqldelight) apply false
```

- [ ] **Step 3: Apply plugin + deps + DB config in `app/build.gradle.kts`**

In the `plugins { ... }` block add:

```kotlin
alias(libs.plugins.sqldelight)
```

At the top level of the file (after the `android { ... }` block) add:

```kotlin
sqldelight {
    databases {
        create("FlashkarteDb") {
            packageName.set("com.flashmd.db")
        }
    }
}
```

In `dependencies { ... }` add:

```kotlin
    implementation(libs.sqldelight.android.driver)
    implementation(libs.sqldelight.coroutines)
    implementation(libs.sqldelight.primitive.adapters)
    implementation(libs.androidx.work.runtime)
    implementation(libs.androidx.hilt.work)
    ksp(libs.androidx.hilt.compiler)

    testImplementation(libs.sqldelight.sqlite.driver)
```

- [ ] **Step 4: Sync/compile to verify the build resolves**

Run: `cd android && ./gradlew help -q`
Expected: configures without dependency-resolution errors. (Generated DB code doesn't exist yet — that's fine; no `.sq` files are referenced from Kotlin yet.)

- [ ] **Step 5: Commit**

```bash
git add android/gradle/libs.versions.toml android/build.gradle.kts android/app/build.gradle.kts
git commit -m "build(android): add SQLDelight, WorkManager, Hilt-Work (#1)"
```

---

### Task 6: Define the SQLDelight schema + queries

**Files:**

- Create: `android/app/src/main/sqldelight/com/flashmd/db/Decks.sq`
- Create: `android/app/src/main/sqldelight/com/flashmd/db/Cards.sq`
- Create: `android/app/src/main/sqldelight/com/flashmd/db/CardProgress.sq`
- Create: `android/app/src/main/sqldelight/com/flashmd/db/Outbox.sq`

All timestamps are stored as ISO-8601 `TEXT` (matches what the server returns and keeps comparisons lexicographic).

- [ ] **Step 1: `Decks.sq`**

```sql
CREATE TABLE deckEntity (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  source_file TEXT,
  created_at TEXT,
  last_studied TEXT,
  total_cards INTEGER NOT NULL DEFAULT 0
);

upsertDeck:
INSERT OR REPLACE INTO deckEntity(id, title, source_file, created_at, last_studied, total_cards)
VALUES (?, ?, ?, ?, ?, ?);

selectAllDecks:
SELECT * FROM deckEntity ORDER BY title;

selectDeck:
SELECT * FROM deckEntity WHERE id = ?;
```

- [ ] **Step 2: `Cards.sq`**

```sql
CREATE TABLE cardEntity (
  id TEXT NOT NULL PRIMARY KEY,
  deck_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  category TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

upsertCard:
INSERT OR REPLACE INTO cardEntity(id, deck_id, front, back, category, position)
VALUES (?, ?, ?, ?, ?, ?);

deleteCardsForDeck:
DELETE FROM cardEntity WHERE deck_id = ?;

selectCardsForDeck:
SELECT * FROM cardEntity WHERE deck_id = ? ORDER BY position;
```

- [ ] **Step 3: `CardProgress.sq`**

```sql
CREATE TABLE progressEntity (
  card_id TEXT NOT NULL PRIMARY KEY,
  easiness REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at TEXT,
  last_reviewed_at TEXT,
  last_rating INTEGER
);

upsertProgress:
INSERT OR REPLACE INTO progressEntity(card_id, easiness, interval_days, repetitions, due_at, last_reviewed_at, last_rating)
VALUES (?, ?, ?, ?, ?, ?, ?);

selectProgress:
SELECT * FROM progressEntity WHERE card_id = ?;

-- Due + new cards for a deck, mirroring the server ordering:
-- progressed-and-due first (by due date), then new cards, then by position.
selectDueCards:
SELECT c.* FROM cardEntity c
LEFT JOIN progressEntity p ON p.card_id = c.id
WHERE c.deck_id = ?
  AND (p.card_id IS NULL OR p.due_at <= ?)
ORDER BY (p.card_id IS NULL) ASC, p.due_at ASC, c.position ASC;
```

- [ ] **Step 4: `Outbox.sq`**

```sql
CREATE TABLE outboxEntity (
  event_id TEXT NOT NULL PRIMARY KEY,
  card_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

enqueue:
INSERT OR IGNORE INTO outboxEntity(event_id, card_id, rating, reviewed_at, created_at)
VALUES (?, ?, ?, ?, ?);

selectAll:
SELECT * FROM outboxEntity ORDER BY created_at;

countAll:
SELECT count(*) FROM outboxEntity;

deleteByIds:
DELETE FROM outboxEntity WHERE event_id IN ?;
```

- [ ] **Step 5: Generate the DB interface**

Run: `cd android && ./gradlew :app:generateDebugFlashkarteDbInterface -q`
Expected: BUILD SUCCESSFUL; generated sources appear under `app/build/generated/sqldelight/.../com/flashmd/db/` including `FlashkarteDb`, `DeckEntityQueries`, `CardEntityQueries`, `ProgressEntityQueries`, `OutboxEntityQueries`.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/sqldelight
git commit -m "feat(android): SQLDelight schema for decks/cards/progress/outbox (#1)"
```

---

### Task 7: Database Hilt module + in-memory DAO test

**Files:**

- Create: `android/app/src/main/java/com/flashmd/data/local/db/DatabaseModule.kt`
- Test: `android/app/src/test/java/com/flashmd/db/OutboxQueriesTest.kt`

- [ ] **Step 1: Write the DatabaseModule**

```kotlin
package com.flashmd.data.local.db

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import com.flashmd.db.FlashkarteDb
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDriver(@ApplicationContext context: Context): SqlDriver =
        AndroidSqliteDriver(FlashkarteDb.Schema, context, "flashkarte.db")

    @Provides
    @Singleton
    fun provideDatabase(driver: SqlDriver): FlashkarteDb = FlashkarteDb(driver)
}
```

- [ ] **Step 2: Write the failing test (in-memory JVM driver)**

```kotlin
package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class OutboxQueriesTest {
    private lateinit var db: FlashkarteDb

    @Before
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        db = FlashkarteDb(driver)
    }

    @Test
    fun enqueueCountAndDeleteByIds() {
        val q = db.outboxEntityQueries
        q.enqueue("e1", "c1", 4, "2026-06-05T09:00:00Z", "2026-06-05T09:00:00Z")
        q.enqueue("e2", "c2", 5, "2026-06-05T09:01:00Z", "2026-06-05T09:01:00Z")
        q.enqueue("e1", "c1", 4, "2026-06-05T09:00:00Z", "2026-06-05T09:00:00Z") // dup ignored
        assertEquals(2L, q.countAll().executeAsOne())

        q.deleteByIds(listOf("e1"))
        assertEquals(1L, q.countAll().executeAsOne())
        assertEquals("e2", q.selectAll().executeAsList().single().event_id)
    }
}
```

- [ ] **Step 3: Run to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.db.OutboxQueriesTest"`
Expected: PASS. (Confirms schema + generated queries + JVM driver all work.)

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/local/db/DatabaseModule.kt android/app/src/test/java/com/flashmd/db/OutboxQueriesTest.kt
git commit -m "feat(android): Hilt DatabaseModule + outbox DAO test (#1)"
```

---

# Phase 3 — Android: offline study + outbox

### Task 8: EventFactory + OutboxRepository (TDD)

`EventFactory` isolates non-deterministic ID/time generation so the outbox is testable.

**Files:**

- Create: `android/app/src/main/java/com/flashmd/data/local/EventFactory.kt`
- Create: `android/app/src/main/java/com/flashmd/data/repository/OutboxRepository.kt`
- Test: `android/app/src/test/java/com/flashmd/db/OutboxRepositoryTest.kt`

- [ ] **Step 1: Write `EventFactory`**

```kotlin
package com.flashmd.data.local

import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Source of UUIDs + timestamps; injectable so tests can make events deterministic. */
@Singleton
open class EventFactory @Inject constructor() {
    open fun newId(): String = UUID.randomUUID().toString()
    open fun nowIso(): String = Instant.now().toString()
}
```

- [ ] **Step 2: Write `OutboxRepository`**

```kotlin
package com.flashmd.data.repository

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToOne
import com.flashmd.data.local.EventFactory
import com.flashmd.db.FlashkarteDb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

data class ReviewEvent(
    val eventId: String,
    val cardId: String,
    val rating: Int,
    val reviewedAt: String,
)

@Singleton
class OutboxRepository @Inject constructor(
    private val db: FlashkarteDb,
    private val events: EventFactory,
) {
    /** Enqueue a rating as a pending sync event and return it. */
    fun enqueue(cardId: String, rating: Int): ReviewEvent {
        val ev = ReviewEvent(events.newId(), cardId, rating, events.nowIso())
        db.outboxEntityQueries.enqueue(ev.eventId, ev.cardId, ev.rating.toLong(), ev.reviewedAt, events.nowIso())
        return ev
    }

    fun pending(): List<ReviewEvent> =
        db.outboxEntityQueries.selectAll().executeAsList().map {
            ReviewEvent(it.event_id, it.card_id, it.rating.toInt(), it.reviewed_at)
        }

    fun ack(eventIds: List<String>) {
        if (eventIds.isNotEmpty()) db.outboxEntityQueries.deleteByIds(eventIds)
    }

    fun pendingCount(): Flow<Long> =
        db.outboxEntityQueries.countAll().asFlow().mapToOne(Dispatchers.IO)
}
```

- [ ] **Step 3: Write the failing test**

```kotlin
package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.EventFactory
import com.flashmd.data.repository.OutboxRepository
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class OutboxRepositoryTest {
    private lateinit var repo: OutboxRepository

    private class FixedFactory : EventFactory() {
        var n = 0
        override fun newId(): String = "e${n++}"
        override fun nowIso(): String = "2026-06-05T09:0${n}:00Z"
    }

    @Before
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        repo = OutboxRepository(FlashkarteDb(driver), FixedFactory())
    }

    @Test
    fun enqueueThenAck() {
        val a = repo.enqueue("c1", 4)
        repo.enqueue("c2", 5)
        assertEquals(2, repo.pending().size)
        assertEquals(4, repo.pending().first().rating)

        repo.ack(listOf(a.eventId))
        val remaining = repo.pending()
        assertEquals(1, remaining.size)
        assertEquals("c2", remaining.first().cardId)
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.db.OutboxRepositoryTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/local/EventFactory.kt android/app/src/main/java/com/flashmd/data/repository/OutboxRepository.kt android/app/src/test/java/com/flashmd/db/OutboxRepositoryTest.kt
git commit -m "feat(android): OutboxRepository + EventFactory (#1)"
```

---

### Task 9: LocalStudyStore + offline-capable StudyRepository/DeckRepository (TDD)

`LocalStudyStore` wraps the SQLDelight queries for decks/cards/progress and applies SM-2 locally on a rating. `StudyRepository` caches on successful online fetches and falls back to local when offline; `applyRating` now always writes locally + enqueues the outbox.

**Files:**

- Create: `android/app/src/main/java/com/flashmd/data/local/LocalStudyStore.kt`
- Modify: `android/app/src/main/java/com/flashmd/data/repository/StudyRepository.kt`
- Modify: `android/app/src/main/java/com/flashmd/data/repository/DeckRepository.kt`
- Test: `android/app/src/test/java/com/flashmd/db/LocalStudyStoreTest.kt`

- [ ] **Step 1: Write `LocalStudyStore`**

```kotlin
package com.flashmd.data.local

import com.flashmd.db.FlashkarteDb
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.sm2.Sm2Algorithm
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocalStudyStore @Inject constructor(
    private val db: FlashkarteDb,
) {
    /** Replace the cached cards for a deck (used after an online fetch of deck detail). */
    fun cacheDeckCards(
        deckId: String,
        cards: List<Card>,
    ) = db.transaction {
        db.cardEntityQueries.deleteCardsForDeck(deckId)
        cards.forEachIndexed { i, c ->
            db.cardEntityQueries.upsertCard(c.id, deckId, c.front, c.back, null, i.toLong())
        }
    }

    fun cacheProgress(p: CardProgress) {
        db.progressEntityQueries.upsertProgress(
            p.cardId, p.easiness, p.interval.toLong(), p.repetitions.toLong(),
            p.dueDate.ifEmpty { null }, p.lastReviewed, p.lastRating?.toLong(),
        )
    }

    fun dueCards(deckId: String): List<DueCard> {
        val nowIso = Instant.now().toString()
        return db.progressEntityQueries.selectDueCards(deckId, nowIso).executeAsList().map { c ->
            val p = db.progressEntityQueries.selectProgress(c.id).executeAsOneOrNull()
            DueCard(
                card = Card(c.id, c.deck_id, c.front, c.back),
                progress = CardProgress(
                    id = c.id, cardId = c.id,
                    easiness = p?.easiness ?: 2.5,
                    interval = (p?.interval_days ?: 0L).toInt(),
                    repetitions = (p?.repetitions ?: 0L).toInt(),
                    dueDate = p?.due_at ?: "",
                    lastReviewed = p?.last_reviewed_at,
                    lastRating = p?.last_rating?.toInt(),
                ),
            )
        }
    }

    /** Apply a rating locally via SM-2 and persist the new progress. Returns the new due ISO date. */
    fun applyRatingLocally(cardId: String, rating: Int, reviewedAtIso: String): String {
        val prev = db.progressEntityQueries.selectProgress(cardId).executeAsOneOrNull()
        val current = CardProgress(
            id = cardId, cardId = cardId,
            easiness = prev?.easiness ?: 2.5,
            interval = (prev?.interval_days ?: 0L).toInt(),
            repetitions = (prev?.repetitions ?: 0L).toInt(),
            dueDate = prev?.due_at ?: "",
            lastReviewed = prev?.last_reviewed_at,
            lastRating = prev?.last_rating?.toInt(),
        )
        val next = Sm2Algorithm.calculate(current, rating)
        val dueIso = Instant.parse(reviewedAtIso).plusSeconds(next.interval.toLong() * 86_400L).toString()
        db.progressEntityQueries.upsertProgress(
            cardId, next.easiness, next.interval.toLong(), next.repetitions.toLong(),
            dueIso, reviewedAtIso, rating.toLong(),
        )
        return dueIso
    }
}
```

> **Note for implementer:** confirm the exact signature of `Sm2Algorithm.calculate` and the field names on `CardProgress` (`android/app/src/main/java/com/flashmd/domain/sm2/Sm2Algorithm.kt`, `domain/model/CardProgress.kt`). The explored model is `CardProgress(id, cardId, easiness, interval, repetitions, dueDate, lastReviewed, lastRating)`. Adapt the constructor call if the SM-2 API differs (e.g. returns an `Sm2Result` with `easiness/interval/repetitions`).

- [ ] **Step 2: Update `StudyRepository`**

Inject `LocalStudyStore` and `OutboxRepository`. Cache on online success; fall back to local; route ratings through local + outbox.

```kotlin
@Singleton
class StudyRepository @Inject constructor(
    private val api: FlashkarteApi,
    private val local: LocalStudyStore,
    private val outbox: OutboxRepository,
) {
    suspend fun getDueCards(deckId: String): List<DueCard> {
        return try {
            val due = apiCall { api.studyBatch(deckId) }.map { dto ->
                DueCard(
                    card = Card(dto.id, deckId, dto.content.front, dto.content.back),
                    progress = CardProgress(dto.id, dto.id, 2.5, 0, 0, "", null, null),
                )
            }
            // best-effort cache of the fetched cards for offline use
            local.cacheDeckCards(deckId, due.map { it.card })
            due
        } catch (e: Exception) {
            val cached = local.dueCards(deckId)
            if (cached.isNotEmpty()) cached else throw e
        }
    }

    /** Offline-first: apply SM-2 locally, enqueue a sync event. The SyncWorker drains it. */
    suspend fun applyRating(cardId: String, rating: Int) {
        val ev = outbox.enqueue(cardId, rating)
        local.applyRatingLocally(cardId, rating, ev.reviewedAt)
    }

    suspend fun getStats(deckId: String): DeckStudyStats { /* unchanged */ }
}
```

> Keep the existing `getStats` body. The `apiCall` import and `DeckStudyStats` data class remain.

- [ ] **Step 3: Cache deck cards from `DeckRepository.getDeckById` online path**

In `DeckRepository`, inject `LocalStudyStore`. After a successful `api.getDeck(id)` that returns the full card list, call `local.cacheDeckCards(id, cards)` so the deck is available offline. (Map `DeckDetailDto` cards → `Card`. Confirm the DTO's card field shape in `dto/Dtos.kt`.)

- [ ] **Step 4: Write the failing test for local SM-2 + due read**

```kotlin
package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.domain.model.Card
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class LocalStudyStoreTest {
    private lateinit var db: FlashkarteDb
    private lateinit var store: LocalStudyStore

    @Before
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        db = FlashkarteDb(driver)
        store = LocalStudyStore(db)
    }

    @Test
    fun cachesCardsAndAppliesRatingLocally() {
        store.cacheDeckCards("d1", listOf(Card("c1", "d1", "front", "back")))
        // new card is due
        assertEquals(1, store.dueCards("d1").size)

        // rating 4 on a new card -> interval 1, reps 1; due date moves out, so no longer due "now"
        store.applyRatingLocally("c1", 4, "2026-06-05T09:00:00Z")
        val p = db.progressEntityQueries.selectProgress("c1").executeAsOne()
        assertEquals(1L, p.interval_days)
        assertEquals(1L, p.repetitions)
        assertEquals(4L, p.last_rating)
        assertTrue(p.due_at!! > "2026-06-05T09:00:00Z")
    }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.db.LocalStudyStoreTest"`
Expected: PASS.

- [ ] **Step 6: Compile the whole app**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 7: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/local/LocalStudyStore.kt android/app/src/main/java/com/flashmd/data/repository/StudyRepository.kt android/app/src/main/java/com/flashmd/data/repository/DeckRepository.kt android/app/src/test/java/com/flashmd/db/LocalStudyStoreTest.kt
git commit -m "feat(android): offline-first study via local SM-2 + outbox (#1)"
```

---

# Phase 4 — Android: sync engine + status UI

### Task 10: Sync DTOs + API method + contract test

**Files:**

- Create: `android/app/src/main/java/com/flashmd/data/remote/dto/SyncDtos.kt`
- Modify: `android/app/src/main/java/com/flashmd/data/remote/FlashkarteApi.kt`
- Test: `android/app/src/test/java/com/flashmd/remote/SyncApiContractTest.kt` (follow the existing `ApiContractTest.kt` MockWebServer pattern)

- [ ] **Step 1: Write the DTOs**

```kotlin
package com.flashmd.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SyncEventDto(
    val event_id: String,
    val card_id: String,
    val rating: Int,
    val reviewed_at: String,
)

@Serializable
data class SyncRequest(val events: List<SyncEventDto>)

@Serializable
data class SyncProgressDto(
    val card_id: String,
    val easiness: Double,
    val interval: Int,
    val repetitions: Int,
    val due_at: String,
    @SerialName("last_rating") val lastRating: Int? = null,
)

@Serializable
data class SyncResponse(
    val acked_event_ids: List<String>,
    val progress: List<SyncProgressDto>,
)
```

- [ ] **Step 2: Add the API method to `FlashkarteApi`**

```kotlin
    @POST("api/study/sync")
    suspend fun syncReviews(@Body body: SyncRequest): SyncResponse
```

(Add the matching imports for `SyncRequest`/`SyncResponse`.)

- [ ] **Step 3: Write a contract test (MockWebServer) mirroring `ApiContractTest.kt`**

```kotlin
package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.SyncEventDto
import com.flashmd.data.remote.dto.SyncRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class SyncApiContractTest {
    @Test
    fun parsesSyncResponse() = runBlocking {
        val server = MockWebServer()
        server.enqueue(
            MockResponse().setBody(
                """{"acked_event_ids":["e1"],"progress":[{"card_id":"c1","easiness":2.5,"interval":1,"repetitions":1,"due_at":"2026-06-06T00:00:00.000Z","last_rating":4}]}""",
            ),
        )
        server.start()
        val json = Json { ignoreUnknownKeys = true }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(FlashkarteApi::class.java)

        val res = api.syncReviews(SyncRequest(listOf(SyncEventDto("e1", "c1", 4, "2026-06-05T09:00:00Z"))))
        assertEquals(listOf("e1"), res.acked_event_ids)
        assertEquals(1, res.progress.single().interval)
        server.shutdown()
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.remote.SyncApiContractTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/remote/dto/SyncDtos.kt android/app/src/main/java/com/flashmd/data/remote/FlashkarteApi.kt android/app/src/test/java/com/flashmd/remote/SyncApiContractTest.kt
git commit -m "feat(android): sync DTOs + syncReviews API + contract test (#1)"
```

---

### Task 11: SyncWorker + scheduler + Hilt-Work wiring

**Files:**

- Create: `android/app/src/main/java/com/flashmd/sync/SyncWorker.kt`
- Create: `android/app/src/main/java/com/flashmd/sync/SyncScheduler.kt`
- Modify: `android/app/src/main/java/com/flashmd/FlashMdApp.kt`
- Modify: `StudyRepository.applyRating` to enqueue a sync after writing locally.

- [ ] **Step 1: Write `SyncWorker`**

```kotlin
package com.flashmd.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.SyncEventDto
import com.flashmd.data.remote.dto.SyncRequest
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.domain.model.CardProgress
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val outbox: OutboxRepository,
    private val api: FlashkarteApi,
    private val local: LocalStudyStore,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val pending = outbox.pending()
        if (pending.isEmpty()) return Result.success()
        return try {
            val res = api.syncReviews(
                SyncRequest(pending.map { SyncEventDto(it.eventId, it.cardId, it.rating, it.reviewedAt) }),
            )
            // overwrite local progress with server-authoritative state
            res.progress.forEach { p ->
                local.cacheProgress(
                    CardProgress(
                        id = p.card_id, cardId = p.card_id,
                        easiness = p.easiness, interval = p.interval, repetitions = p.repetitions,
                        dueDate = p.due_at, lastReviewed = null, lastRating = p.lastRating,
                    ),
                )
            }
            outbox.ack(res.acked_event_ids)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
```

- [ ] **Step 2: Write `SyncScheduler`**

```kotlin
package com.flashmd.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun requestSync() {
        val req = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context)
            .enqueueUniqueWork("flashkarte-sync", ExistingWorkPolicy.APPEND_OR_REPLACE, req)
    }
}
```

- [ ] **Step 3: Wire Hilt-Work into `FlashMdApp`**

```kotlin
@HiltAndroidApp
class FlashMdApp : Application(), Configuration.Provider {
    @Inject lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().setWorkerFactory(workerFactory).build()
}
```

(Add imports: `androidx.work.Configuration`, `androidx.hilt.work.HiltWorkerFactory`, `javax.inject.Inject`. Keep the existing `@HiltAndroidApp` annotation and any existing body.) Because a custom `Configuration.Provider` is used, ensure the default WorkManager initializer is removed — add to `AndroidManifest.xml` inside `<application>`:

```xml
<provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
</provider>
```

(Add `xmlns:tools="http://schemas.android.com/tools"` to the manifest root if not present.)

- [ ] **Step 4: Trigger sync from `applyRating` and on app foreground**

In `StudyRepository`, inject `SyncScheduler` and call `scheduler.requestSync()` at the end of `applyRating`. Also call it once when the deck-list screen loads (inject into the relevant ViewModel or call from `StudyRepository.getDueCards`). Keep it idempotent (unique work).

- [ ] **Step 5: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/flashmd/sync android/app/src/main/java/com/flashmd/FlashMdApp.kt android/app/src/main/AndroidManifest.xml android/app/src/main/java/com/flashmd/data/repository/StudyRepository.kt
git commit -m "feat(android): WorkManager SyncWorker drains outbox to /api/study/sync (#1)"
```

---

### Task 12: Sync status chip

**Files:**

- Create: `android/app/src/main/java/com/flashmd/ui/components/SyncStatusChip.kt`
- Modify: the deck-list screen + its ViewModel to expose `outbox.pendingCount()` and show the chip.

- [ ] **Step 1: Write the composable**

```kotlin
package com.flashmd.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SyncStatusChip(pendingCount: Long, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val label = if (pendingCount > 0) "$pendingCount pending — sync now" else "Synced"
    AssistChip(
        onClick = onRetry,
        label = { Text(label) },
        modifier = modifier.padding(8.dp),
        colors = AssistChipDefaults.assistChipColors(),
    )
}
```

- [ ] **Step 2: Expose pending count from the deck-list ViewModel**

Inject `OutboxRepository` + `SyncScheduler`. Expose `val pending = outbox.pendingCount().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0L)`, and an `onRetry()` that calls `scheduler.requestSync()`.

- [ ] **Step 3: Render the chip on the deck-list screen**

Collect `pending` with `collectAsStateWithLifecycle()` and place `SyncStatusChip(pending, viewModel::onRetry)` in the screen's top area. Match the existing screen's layout conventions.

- [ ] **Step 4: Compile + run unit tests**

Run: `cd android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL; all unit tests pass (parser, sm2, api-contract, db, sync).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/components/SyncStatusChip.kt android/app/src/main/java/com/flashmd/ui/screens
git commit -m "feat(android): sync status chip on deck list (#1)"
```

---

# Phase 5 — Verification & rollout

### Task 13: Full verification

- [ ] **Step 1: Server suite**

Run: `cd packages/server && npm test`
Expected: all green.

- [ ] **Step 2: Shared suite (SM-2 must be unchanged)**

Run: `cd packages/shared && npm test`
Expected: 24 green.

- [ ] **Step 3: Android unit tests + debug compile**

Run: `cd android && ./gradlew :app:testDebugUnitTest :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Manual smoke (optional, at a desk)**

Build the debug APK, open a deck while online (caches it), enable airplane mode, study and rate several cards (UI advances, progress persists), disable airplane mode, confirm the sync chip drains to "Synced" and `review_events`/`card_progress` on the server reflect the ratings with the offline timestamps.

### Task 14: Ship

- [ ] **Step 1: Push to main (server-first is automatic — migration 008 + /sync are additive and backward-compatible)**

```bash
git push origin main
```

CI runs tests → builds → deploys the server; `android/**` changes trigger the Play internal publish. The new endpoint is live before the Android release reaches devices, so there is no ordering hazard.

- [ ] **Step 2: Close issue #1 once the Android internal build is verified.**

---

## Notes for the implementer

- **Parser parity rule does not apply here** — no Markdown-parser changes. SM-2 is reused, not reimplemented; do not edit `packages/shared/src/sm2/sm2.ts` or the Kotlin/Python ports.
- **The `/api/study/review` endpoint stays** for backward compatibility; Android now uses `/api/study/sync` exclusively (outbox path), so the old `api.review(...)` call is removed from `StudyRepository`.
- **Confirm exact existing signatures** before adapting: `Sm2Algorithm.calculate` and `CardProgress` fields (Android), and the `DeckDetailDto` card shape used in Task 9 Step 3.
- **SQLDelight list-parameter binding** (`IN ?`) generates a `Collection<String>` parameter — pass a `List`. Verify the generated `deleteByIds` signature after Task 6.

```

```
