# Card Series — Ordered Decks (#3 slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** A deck can be "Study in order" — the current card must be answered correctly before the next unlocks. Server flag + Android toggle + study-engine gate. No parser/SM-2 changes.

**Tech Stack:** Express+TS+Postgres (Jest), Kotlin/Compose (mockk + coroutines-test).

**Spec:** docs/superpowers/specs/2026-06-05-card-series-design.md

---

### Task 1: Server — `is_ordered` column + repo/service/controller + test

**Files:**

- Create: `packages/server/src/db/migrations/009_deck_is_ordered.sql`
- Modify: `packages/server/src/domains/decks/decks.repository.ts`
- Modify: `packages/server/src/domains/decks/decks.service.ts`
- Modify: `packages/server/src/domains/decks/decks.controller.ts`
- Test: `packages/server/src/domains/decks/decks.routes.test.ts`

- [ ] **Step 1: Migration**

```sql
-- 009_deck_is_ordered.sql
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_ordered boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Repository** — add `is_ordered: boolean` to `DeckRow`; change
      `DECK_COLS` to `"id, title, source_filename, created_at, updated_at, is_public, is_ordered"`;
      add `d.is_ordered` to the `listDecksWithCounts` SELECT list (after `d.is_public,`);
      add:

```ts
export function setDeckOrdered(userId: string, id: string, isOrdered: boolean) {
  return queryOne<DeckRow>(
    `UPDATE decks SET is_ordered = $1, updated_at = now()
     WHERE id = $2 AND user_id = $3
     RETURNING ${DECK_COLS}`,
    [isOrdered, id, userId],
  );
}
```

- [ ] **Step 3: Service `update`** — change the signature to
      `patch: { title?: unknown; isPublic?: unknown; isOrdered?: unknown }` and append:

```ts
if (patch.isOrdered !== undefined) {
  if (typeof patch.isOrdered !== "boolean") {
    throw new ValidationError("isOrdered must be a boolean");
  }
  deck = (await repo.setDeckOrdered(userId, id, patch.isOrdered)) ?? deck;
}
```

- [ ] **Step 4: Controller `update`** — forward it:

```ts
    await service.update(req.userId!, req.params.id, {
      title: req.body.title,
      isPublic: req.body.isPublic,
      isOrdered: req.body.isOrdered,
    }),
```

- [ ] **Step 5: Add a route test** (inside `decks.routes.test.ts`'s describe block)

```ts
test("PATCH /api/decks/:id forwards isOrdered", async () => {
  mock.update.mockResolvedValue({
    id: "d1",
    title: "T",
    is_ordered: true,
  } as never);
  const res = await request(app)
    .patch("/api/decks/d1")
    .send({ isOrdered: true });
  expect(res.status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith(
    "u1",
    "d1",
    expect.objectContaining({ isOrdered: true }),
  );
});
```

(Confirm the existing test file's mock name for the decks service — it uses
`jest.mock("./decks.service")` and a `mock` alias; match the existing style. If
the file mocks differently, mirror its existing PATCH/update test.)

- [ ] **Step 6: Validate migration on a scratch DB + run server tests**

Run: `cd packages/server && createdb fk_mig_$$ && psql -d fk_mig_$$ -v ON_ERROR_STOP=1 -c "CREATE TABLE decks(id int);" -f src/db/migrations/009_deck_is_ordered.sql && dropdb fk_mig_$$ && npx jest decks.routes`
Expected: migration applies; decks route tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/db/migrations/009_deck_is_ordered.sql packages/server/src/domains/decks
git commit -m "feat(server): decks.is_ordered flag + PATCH support (#3)"
```

---

### Task 2: Android — DTOs + Deck model + repo + menu toggle

**Files:**

- Modify: `data/remote/dto/Dtos.kt` (DeckListItemDto, DeckDetailDto, UpdateDeckRequest)
- Modify: `domain/model/Deck.kt`
- Modify: `data/repository/DeckRepository.kt`
- Modify: `ui/screens/decklist/DeckListViewModel.kt` + `DeckListScreen.kt`

- [ ] **Step 1: DTOs** — add `@SerialName("is_ordered") val isOrdered: Boolean = false`
      to `DeckListItemDto` and `DeckDetailDto`; add `val isOrdered: Boolean? = null` to
      `UpdateDeckRequest`.

- [ ] **Step 2: `Deck` model** — add `val isOrdered: Boolean = false,`.

- [ ] **Step 3: `DeckRepository`** — in `toDomain()` add `isOrdered = isOrdered,`;
      in `getDeckById`'s `Deck(...)` mapping add `isOrdered = it.isOrdered,`; add:

```kotlin
    suspend fun setOrdered(id: String, isOrdered: Boolean) {
        apiCall { api.updateDeck(id, com.flashmd.data.remote.dto.UpdateDeckRequest(isOrdered = isOrdered)) }
        refresh()
    }
```

- [ ] **Step 4: `DeckListViewModel`** — add:

```kotlin
    fun setOrdered(id: String, isOrdered: Boolean) = viewModelScope.launch {
        try { deckRepo.setOrdered(id, isOrdered) }
        catch (e: Exception) { _listError.value = "Couldn't update study order." }
    }
```

- [ ] **Step 5: `DeckListScreen`** — pass a new callback to `DeckCard` and add a
      menu item. In the `items(...)` block add
      `onToggleOrdered = { viewModel.setOrdered(row.deck.id, !row.deck.isOrdered) },`.
      Add the param to `DeckCard`'s signature
      (`onToggleOrdered: () -> Unit,`) and a `DropdownMenuItem` after the publish item:

```kotlin
                    DropdownMenuItem(
                        text = { Text(if (row.deck.isOrdered) "Unordered study" else "Study in order") },
                        onClick = { menuOpen = false; onToggleOrdered() },
                    )
```

- [ ] **Step 6: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 7: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data android/app/src/main/java/com/flashmd/domain/model/Deck.kt android/app/src/main/java/com/flashmd/ui/screens/decklist
git commit -m "feat(android): deck 'Study in order' toggle + isOrdered plumbing (#3)"
```

---

### Task 3: Android — study-engine gate (TDD)

**Files:**

- Modify: `ui/screens/study/StudyViewModel.kt`
- Test: `app/src/test/java/com/flashmd/ui/StudyOrderedViewModelTest.kt`

- [ ] **Step 1: Read `deck.isOrdered` + gate re-queue**

In `StudyViewModel`, add `private var ordered = false`. In `init`, after
`val deck = deckRepo.getDeckById(deckId)`, set `ordered = deck?.isOrdered == true`.
In `applyAndAdvance`, change the re-queue branch:

```kotlin
        if (rating < 3) {
            if (ordered) queue.addFirst(card) else queue.add(card)
        } else {
            reviewed++
        }
```

- [ ] **Step 2: Write the failing test**

```kotlin
package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.local.StudyMode
import com.flashmd.data.local.StudyModeStore
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
import com.flashmd.ui.screens.study.StudyViewModel
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudyOrderedViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)

    private fun due(id: String) = DueCard(
        Card(id, "d1", "front-$id", "back-$id"),
        CardProgress(id, id, 2.5, 0, 0, "", null, null),
    )

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { modeStore.mode } returns flowOf(StudyMode.FLIP)
        coEvery { studyRepo.getDueCards("d1") } returns listOf(due("c1"), due("c2"))
    }
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = StudyViewModel(
        deckRepo, studyRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")), modeStore,
    )

    @Test fun orderedDeckRepeatsCardUntilPassed() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "D", "", "", null, isOrdered = true)
        val vm = vm(); advanceUntilIdle()
        vm.flip(); vm.rate(1); advanceUntilIdle()
        assertEquals("c1", vm.uiState.value.currentCard?.card?.id) // still on c1
    }

    @Test fun unorderedDeckAdvancesOnWrong() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "D", "", "", null, isOrdered = false)
        val vm = vm(); advanceUntilIdle()
        vm.flip(); vm.rate(1); advanceUntilIdle()
        assertEquals("c2", vm.uiState.value.currentCard?.card?.id) // moved to c2
    }
}
```

- [ ] **Step 3: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.StudyOrderedViewModelTest"`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/study/StudyViewModel.kt android/app/src/test/java/com/flashmd/ui/StudyOrderedViewModelTest.kt
git commit -m "feat(android): ordered-deck must-pass-to-advance study gate + tests (#3)"
```

---

### Task 4: Verify

- [ ] **Step 1: Android compile + full unit tests**

Run: `cd android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL; all green.

- [ ] **Step 2: Server suite**

Run: `cd packages/server && npm test`
Expected: green (migration auto-applies on deploy).

- [ ] **Step 3: Ship** — push to `main` after user green-light (batched with #2/#24
      per the user). Server (migration 009 additive) + Android both deploy.
