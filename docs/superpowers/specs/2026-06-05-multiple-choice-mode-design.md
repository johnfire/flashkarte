# Multiple-choice study mode (#2) — Design

_Date: 2026-06-05 · Scope: Android · No server / data-model changes_

## Goal

Add a multiple-choice study mode alongside the existing flip / self-grade flow.
In Choice mode the card front is shown with N answer options (the correct back +
distractors); the user taps one and the app grades automatically through the
existing SM-2 path.

## Decisions

- **Distractors are auto-generated** from other cards' backs in the current study
  session — no authored distractors, so no parser/migration/server changes. The
  feature is purely client-side and works on every existing deck. (Authored
  distractors, floated in the issue, would need the 3-port parser + a migration;
  deferred.)
- **Platform: Android only** for this iteration.
- **Auto-grade mapping:** correct → rating **4 (Good)**; incorrect → rating
  **1 (Again)**, which re-queues the card (same as a low self-grade today).
- **Mode is per-user persistent** (DataStore), defaulting to **Flip**, so the
  choice sticks across sessions — mirrors how theme is persisted.

## Architecture

All changes are in `ui/screens/study/` plus a small `data/local` store. The
study queue, `applyRating`, and the offline/sync path are unchanged — Choice mode
just derives a rating and feeds the same `applyRating(cardId, rating)` call.

- **`StudyMode` enum** (`FLIP`, `CHOICE`).
- **`StudyModeStore`** (`data/local/StudyModeStore.kt`): DataStore-backed,
  `mode: Flow<StudyMode>` + `suspend setMode(...)`. Uses its own datastore name
  (`flashkarte_study_prefs`) to avoid colliding with the theme/session stores.
- **`McOptions`** (`ui/screens/study/McOptions.kt`): pure helper
  `build(correct: String, pool: List<String>, count: Int = 4, random: Random): List<String>`
  — returns the correct answer plus up to `count-1` distinct distractors drawn
  from `pool` (excluding any equal to `correct`), shuffled. Pure → unit-testable.
- **`StudyViewModel`**: inject `StudyModeStore`. Hold the session's distractor
  pool (distinct backs of all loaded due cards). Extend `StudyUiState` with
  `mode`, `options`, `selectedOption`, and the current `correctAnswer`. Regenerate
  `options` whenever the current card changes (in Choice mode). Refactor the
  rating core out of `rate()` into a private `applyAndAdvance(rating)` reused by
  both modes.
  - `setMode(mode)` — persists + updates state (and builds options if switching to
    Choice mid-session).
  - `chooseAnswer(option)` — records the selection and reveals correctness; does
    not advance.
  - `next()` — computes `rating = if (selectedOption == correctAnswer) 4 else 1`,
    calls `applyAndAdvance(rating)`, clears the selection, and builds options for
    the next card.
- **`StudyScreen`**: a segmented control (`Flip` / `Choice`) under the progress
  row. In Choice mode, render the front (reusing the question `CardFace`) plus a
  column of option buttons. After a tap: highlight the chosen option
  green/red and reveal the correct one, replace the row with a **Continue**
  button → `next()`. Flip mode is unchanged.

## Edge cases

- **Small decks / thin pool:** if fewer than `count-1` distinct distractors exist,
  show fewer options (minimum 2 = correct + 1). If the pool is empty (1-card
  session), Choice mode shows just the correct answer as a single option — tapping
  it grades correct.
- **Duplicate backs:** the pool is de-duplicated and excludes any value equal to
  the correct answer, so the correct option is never duplicated as a distractor.
- **Switching mode mid-session:** allowed; the current card stays, options build
  on demand.

## Testing

- `McOptions.build` (pure, seeded `Random`): correct answer always present;
  option count = `min(count, distinctPool+1)`; no duplicates; correct never
  appears twice; empty pool → `[correct]`.
- `StudyViewModel` (mockk repos, `StandardTestDispatcher`): choosing the correct
  option applies rating 4 and advances; choosing wrong applies rating 1 and
  re-queues; `setMode` persists via the store.
- `compileDebugKotlin` + full unit suite green. No emulator-dependent tests.

## Out of scope

- Authored distractors, web support, per-deck (vs per-user) mode, timed/quiz
  scoring. All deferred.
