# Multiple-choice Study Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** Add an auto-graded multiple-choice study mode alongside the flip flow, Android-only, no server changes.

**Architecture:** A persisted `StudyMode`, a pure `McOptions` option builder, `StudyViewModel` extended to derive options + grade choices through the existing `applyRating` path, and a `StudyScreen` segmented toggle + option UI.

**Tech Stack:** Kotlin/Compose, Hilt, DataStore, JUnit4 + mockk + coroutines-test.

**Spec:** docs/superpowers/specs/2026-06-05-multiple-choice-mode-design.md

---

### Task 1: StudyMode enum + StudyModeStore

**Files:**

- Create: `data/local/StudyModeStore.kt`

- [ ] **Step 1: Write the enum + store**

```kotlin
package com.flashmd.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

enum class StudyMode {
    FLIP,
    CHOICE;

    companion object {
        fun from(value: String?): StudyMode = entries.firstOrNull { it.name == value } ?: FLIP
    }
}

private val Context.studyDataStore by preferencesDataStore(name = "flashkarte_study_prefs")

@Singleton
class StudyModeStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val key = stringPreferencesKey("study_mode")

    val mode: Flow<StudyMode> = context.studyDataStore.data.map { StudyMode.from(it[key]) }

    suspend fun setMode(mode: StudyMode) {
        context.studyDataStore.edit { it[key] = mode.name }
    }
}
```

- [ ] **Step 2: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/local/StudyModeStore.kt
git commit -m "feat(android): StudyMode enum + persisted StudyModeStore (#2)"
```

---

### Task 2: McOptions pure helper (TDD)

**Files:**

- Create: `ui/screens/study/McOptions.kt`
- Test: `app/src/test/java/com/flashmd/ui/McOptionsTest.kt`

- [ ] **Step 1: Write `McOptions`**

```kotlin
package com.flashmd.ui.screens.study

import kotlin.random.Random

object McOptions {
    /**
     * Build multiple-choice options: the [correct] answer plus up to [count]-1
     * distinct distractors from [pool] (excluding any equal to [correct]),
     * shuffled. Returns at least [correct]. Deterministic given [random].
     */
    fun build(
        correct: String,
        pool: List<String>,
        count: Int = 4,
        random: Random = Random.Default,
    ): List<String> {
        val distractors = pool.asSequence()
            .filter { it != correct }
            .distinct()
            .toMutableList()
        distractors.shuffle(random)
        val chosen = distractors.take((count - 1).coerceAtLeast(0))
        return (chosen + correct).shuffled(random)
    }
}
```

- [ ] **Step 2: Write the failing test**

```kotlin
package com.flashmd.ui

import com.flashmd.ui.screens.study.McOptions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class McOptionsTest {
    @Test fun includesCorrectAndCapsCount() {
        val opts = McOptions.build("A", listOf("B", "C", "D", "E"), count = 4, random = Random(1))
        assertEquals(4, opts.size)
        assertTrue("A" in opts)
        assertEquals(opts.size, opts.toSet().size) // no duplicates
    }

    @Test fun excludesCorrectFromDistractorsAndDedupes() {
        val opts = McOptions.build("A", listOf("A", "A", "B", "B"), count = 4, random = Random(2))
        assertEquals(listOf("A", "B").sorted(), opts.sorted())
    }

    @Test fun emptyPoolReturnsOnlyCorrect() {
        assertEquals(listOf("A"), McOptions.build("A", emptyList(), random = Random(3)))
    }

    @Test fun smallPoolReturnsCorrectPlusAvailable() {
        val opts = McOptions.build("A", listOf("B"), count = 4, random = Random(4))
        assertEquals(listOf("A", "B").sorted(), opts.sorted())
    }
}
```

- [ ] **Step 3: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.McOptionsTest"`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/study/McOptions.kt android/app/src/test/java/com/flashmd/ui/McOptionsTest.kt
git commit -m "feat(android): McOptions distractor builder + tests (#2)"
```

---

### Task 3: StudyViewModel — mode + choice grading (TDD)

**Files:**

- Modify: `ui/screens/study/StudyViewModel.kt`
- Test: `app/src/test/java/com/flashmd/ui/StudyChoiceViewModelTest.kt`

- [ ] **Step 1: Extend `StudyUiState`**

Add fields:

```kotlin
    val mode: com.flashmd.data.local.StudyMode = com.flashmd.data.local.StudyMode.FLIP,
    val options: List<String> = emptyList(),
    val selectedOption: String? = null,
    val correctAnswer: String? = null,
```

- [ ] **Step 2: Inject the store + build options + grade choices**

Add `private val studyModeStore: StudyModeStore` to the constructor (import
`com.flashmd.data.local.StudyMode` / `StudyModeStore`). Add a session pool field
`private var pool: List<String> = emptyList()` and a `Random` field
`private val random = kotlin.random.Random.Default`.

In `init`, after `queue.addAll(due)`, set `pool = due.map { it.card.back }`, read
the persisted mode once (`studyModeStore.mode.first()` — import
`kotlinx.coroutines.flow.first`), and when the queue is non-empty include
`mode = savedMode` and the freshly built options in the state. Add a helper:

```kotlin
    private fun optionsFor(card: DueCard): List<String> =
        com.flashmd.ui.screens.study.McOptions.build(card.card.back, pool, 4, random)
```

When building the non-empty initial state, set:

```kotlin
            currentCard = queue.peek(),
            mode = savedMode,
            options = if (savedMode == StudyMode.CHOICE) optionsFor(queue.peek()) else emptyList(),
            correctAnswer = queue.peek().card.back,
```

Refactor the body of `rate()` after the `applyRating` call into a private
`applyAndAdvance(card: DueCard, rating: Int)` that polls the queue, updates
`ratingCounts`/`reviewed`/re-queue, and emits the next state — building options
for the next card and resetting `selectedOption`:

```kotlin
    private fun applyAndAdvance(card: DueCard, rating: Int) {
        queue.poll()
        ratingCounts[rating] = (ratingCounts[rating] ?: 0) + 1
        if (rating < 3) queue.add(card) else reviewed++

        if (queue.isEmpty()) {
            _uiState.value = _uiState.value.copy(
                currentCard = null, isDone = true, reviewed = reviewed,
                ratingCounts = ratingCounts.toMap(), selectedOption = null,
            )
        } else {
            val next = queue.peek()
            _uiState.value = _uiState.value.copy(
                currentCard = next,
                isFlipped = false,
                remaining = queue.size,
                reviewed = reviewed,
                ratingCounts = ratingCounts.toMap(),
                selectedOption = null,
                correctAnswer = next.card.back,
                options = if (_uiState.value.mode == StudyMode.CHOICE) optionsFor(next) else emptyList(),
            )
        }
    }
```

Change `rate()` to call `applyAndAdvance(card, rating)` in place of its inline
advance logic (keeping the `applyRating` try/catch). Add:

```kotlin
    fun setMode(mode: StudyMode) {
        viewModelScope.launch { studyModeStore.setMode(mode) }
        val card = _uiState.value.currentCard
        _uiState.value = _uiState.value.copy(
            mode = mode,
            selectedOption = null,
            options = if (mode == StudyMode.CHOICE && card != null) optionsFor(card) else emptyList(),
            correctAnswer = card?.card?.back,
        )
    }

    fun chooseAnswer(option: String) {
        if (_uiState.value.selectedOption != null) return
        _uiState.value = _uiState.value.copy(selectedOption = option)
    }

    fun next() {
        val card = _uiState.value.currentCard ?: return
        val selected = _uiState.value.selectedOption ?: return
        val rating = if (selected == card.card.back) 4 else 1
        viewModelScope.launch {
            try {
                studyRepo.applyRating(card.card.id, rating)
            } catch (e: ApiException) {
                _uiState.value = _uiState.value.copy(error = e.message); return@launch
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "review failed", "Study.next", e)
                _uiState.value = _uiState.value.copy(error = "Couldn't save that answer."); return@launch
            }
            applyAndAdvance(card, rating)
        }
    }
```

- [ ] **Step 3: Write the failing test**

```kotlin
package com.flashmd.ui

import com.flashmd.data.local.StudyMode
import com.flashmd.data.local.StudyModeStore
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
import androidx.lifecycle.SavedStateHandle
import io.mockk.coEvery
import io.mockk.coVerify
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudyChoiceViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)

    private fun due(id: String, back: String) = DueCard(
        Card(id, "d1", "front-$id", back),
        CardProgress(id, id, 2.5, 0, 0, "", null, null),
    )

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        coEvery { modeStore.mode } returns flowOf(StudyMode.CHOICE)
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "Deck", "", "", null)
        coEvery { studyRepo.getDueCards("d1") } returns listOf(due("c1", "A"), due("c2", "B"))
    }
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = StudyViewModel(
        deckRepo, studyRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")),
        modeStore,
    )

    @Test fun correctChoiceGradesGood() = runTest {
        val vm = vm(); advanceUntilIdle()
        assertTrue(vm.uiState.value.options.contains("A"))
        vm.chooseAnswer("A"); vm.next(); advanceUntilIdle()
        coVerify { studyRepo.applyRating("c1", 4) }
    }

    @Test fun wrongChoiceGradesAgain() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.chooseAnswer("B"); vm.next(); advanceUntilIdle()
        coVerify { studyRepo.applyRating("c1", 1) }
    }
}
```

- [ ] **Step 4: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.StudyChoiceViewModelTest"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/study/StudyViewModel.kt android/app/src/test/java/com/flashmd/ui/StudyChoiceViewModelTest.kt
git commit -m "feat(android): study choice mode in StudyViewModel + tests (#2)"
```

---

### Task 4: StudyScreen — mode toggle + choice UI

**Files:**

- Modify: `ui/screens/study/StudyScreen.kt`

- [ ] **Step 1: Add the segmented toggle + choice rendering**

Add imports: `androidx.compose.material3.SegmentedButton`,
`androidx.compose.material3.SegmentedButtonDefaults`,
`androidx.compose.material3.SingleChoiceSegmentedButtonRow`,
`com.flashmd.data.local.StudyMode`.

Under the progress text, add:

```kotlin
            SingleChoiceSegmentedButtonRow(Modifier.padding(bottom = 8.dp)) {
                SegmentedButton(
                    selected = state.mode == StudyMode.FLIP,
                    onClick = { viewModel.setMode(StudyMode.FLIP) },
                    shape = SegmentedButtonDefaults.itemShape(0, 2),
                ) { Text("Flip") }
                SegmentedButton(
                    selected = state.mode == StudyMode.CHOICE,
                    onClick = { viewModel.setMode(StudyMode.CHOICE) },
                    shape = SegmentedButtonDefaults.itemShape(1, 2),
                ) { Text("Choice") }
            }
```

Replace the `if (card != null) { FlipCard(...) ... }` block with a branch on mode:

```kotlin
            if (card != null) {
                if (state.mode == StudyMode.CHOICE) {
                    ChoicePanel(
                        front = card.card.front,
                        options = state.options,
                        selected = state.selectedOption,
                        correct = card.card.back,
                        onChoose = { viewModel.chooseAnswer(it) },
                        onContinue = { viewModel.next() },
                        modifier = Modifier.weight(1f).padding(horizontal = 20.dp, vertical = 12.dp),
                    )
                } else {
                    FlipCard(
                        front = card.card.front,
                        back = card.card.back,
                        isFlipped = state.isFlipped,
                        onClick = { viewModel.flip() },
                        modifier = Modifier.weight(1f).padding(horizontal = 20.dp, vertical = 12.dp),
                    )
                    if (state.isFlipped) {
                        RatingRow(onRate = { viewModel.rate(it) })
                    } else {
                        Text(
                            "Tap card to reveal answer",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 24.dp),
                        )
                    }
                }
            }
```

Add the `ChoicePanel` composable:

```kotlin
@Composable
private fun ChoicePanel(
    front: String,
    options: List<String>,
    selected: String?,
    correct: String,
    onChoose: (String) -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier.fillMaxWidth().weight(1f),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            tonalElevation = 4.dp,
        ) {
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("QUESTION", style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(16.dp))
                Text(front, style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(12.dp))
        options.forEach { option ->
            val answered = selected != null
            val container = when {
                !answered -> MaterialTheme.colorScheme.surfaceVariant
                option == correct -> Color(0xFF2E7D32)
                option == selected -> Color(0xFFC62828)
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
            Button(
                onClick = { onChoose(option) },
                enabled = !answered,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = container,
                    disabledContainerColor = container,
                ),
            ) { Text(option, textAlign = TextAlign.Center) }
        }
        if (selected != null) {
            Spacer(Modifier.height(8.dp))
            Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) { Text("Continue") }
        }
    }
}
```

- [ ] **Step 2: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL. If `SingleChoiceSegmentedButtonRow` is unresolved,
confirm Material3 version supports it (composeBom 2024.09.03 does); otherwise fall
back to two `FilterChip`s.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/study/StudyScreen.kt
git commit -m "feat(android): Flip/Choice toggle + multiple-choice panel (#2)"
```

---

### Task 5: Verify

- [ ] **Step 1: Full compile + unit tests**

Run: `cd android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL; all tests pass (including McOptions + StudyChoice).

- [ ] **Step 2: Ship** — push to `main` after user green-light (triggers Play internal). Confirm the Android Release run succeeds.
