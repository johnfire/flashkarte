# Web MC mode + diagnostic interludes — Design

_Date: 2026-09-15 · Scope: packages/web + a small packages/server addition · Phase 1 of 4
(confidence rating, case scoring, and branch/case play on web follow separately)_

## Goal

Bring the multiple-choice study mode and diagnostic-card remediation interludes — both
already shipped on Android (Spec 01, commit `946f8e7`) — to `packages/web`. Web study is
currently flip-only. This is the part of the original Spec 08 (web parity) that has no
unbuilt dependency: it consumes shared logic (`packages/shared/src/study/diagnostic.ts`)
that already exists and is already exercised by Android's test suite.

Deliberately out of scope for this phase: the confidence bar (needs Spec 02, unbuilt — no
`confidence` column exists anywhere) and branch/case play with scoring (needs Spec 07,
unbuilt — Android's branch play has zero persistence today). Those are phases 2–4.

## Current state (verified 2026-09-15)

- `packages/shared/src/study/diagnostic.ts` already has `selectOptions` and `resolveChoice`,
  TS-ported and tested against Android's Kotlin mirror (`DiagnosticStudy.kt`).
- Server's `/decks/:id/study` (`study.repository.ts` `CardForStudy`) already returns
  `content.label` and `content.options` verbatim — nothing to change there.
- Server's `POST /api/study/review` (the web live-review path) does **not** write to
  `review_events` at all today — only `POST /api/study/sync` (Android's offline-outbox
  flush) does. `review_events` was built as an idempotency ledger for offline sync
  (migration `008_review_events.sql`), not a universal ledger, so web reviews have never
  produced a ledger row. This means diagnostic `option_index` has nowhere to land for a
  web-originated pick unless the review endpoint is extended — and, as a side effect, it
  means Spec 05's confusion-pair mining currently has zero web-originated data.
- `packages/web/src/api/types.ts` `StudyCard` only carries `{front, back, sense}` — no
  `label`/`options` — and `api.study.review` doesn't send `option_index`.
- `packages/web/src/pages/StudyPage.tsx` is flip-only: one `grade(rating)` path driven by
  four fixed rating buttons.
- All 8 of the user's current decks are `is_branching: false` with every card `type:
  "basic"` and no `options` — none use diagnostic/branch cards yet (verified via the
  `flashkarte` MCP `list_decks`/`get_deck` tools).

## Commit 1 — server: review endpoint writes the ledger

- `POST /api/study/review` request body gains an optional `option_index` (int ≥ 0,
  nullable). `study.service.ts`'s `review()` gains a matching optional parameter.
- After the existing SM-2 progress update (unchanged), `review()` now also calls
  `repo.insertReviewEvent` (already exists, used by `sync`) with a server-generated
  `event_id` (`crypto.randomUUID()`), the given `rating`, and `option_index ?? null`. This
  fires for every review from now on, not just diagnostic picks — closing the "web reviews
  never hit the ledger" gap as a byproduct, not just for MC.
- Old request bodies (no `option_index`) behave identically except for now also getting a
  ledger row — a strict superset of today's behavior, contract-tested explicitly.

## Commit 2 — web: MC mode + diagnostic interludes

**Mode persistence:** `useStudyMode()` hook, `localStorage`-backed (`flashkarte_study_mode`,
default `"flip"`) — matches the existing pattern in `theme/useTheme.ts`. Per-device, no
server sync, consistent with Android's per-device `StudyModeStore`.

**`StudyPage` additions:**
- `mode: "flip" | "choice"`, `options: StudyOption[]`, `selectedOption`, `remediation: Card
  | null`, `deckCards: Card[] | null` (lazily fetched via `api.decks.get`, only if the
  batch contains a diagnostic card), `sessionPool` (batch card backs, for ordinary-card
  distractors).
- `submitRating(rating, optionIndex?)` factored out of today's `grade()` as the shared tail
  (call the API, mark `reviewedIds`, requeue on lapse, advance `idx`) — used by both
  Flip-mode buttons and Choice-mode picks. Mirrors Android's `applyAndAdvance` refactor.
- New `ChoicePanel` component: front prompt, option buttons (disabled + colored after a
  pick), Continue button. Keyboard: digits 1–9 pick pre-answer, Space/Enter advances
  post-answer.
- Remediation interlude: a distinct render branch showing the target card's front+back
  together, one Continue button, no rating controls, no `review` call — dismissing just
  advances the queue.
- Segmented Flip/Choice toggle under the progress row; switching mid-session keeps the
  current card and rebuilds options on demand.

**Edge cases** (mostly free from the shared logic, already covered by Android's tests):
routed-to-`end` wrong picks (no interlude), thin/empty distractor pools, mixed
diagnostic/ordinary decks in one session. Branch decks remain excluded entirely —
`isFlippable` still filters them out before any of this runs.

**Failure handling:** `review` failure → today's behavior unchanged (alert, no advance).
`deckCards` fetch failure → log via `reportClientError`, skip the interlude silently
(remediation is enrichment, not core to grading — fails open).

**i18n:** new `study.*` keys (mode toggle, "Continue", remediation heading) added to all
four locale files together (`localesParity.test.ts` enforces full coverage).

## Testing

**Server** (`study.service.test.ts` / `study.repository.test.ts`): `option_index` persists
to `review_events`; omitted `option_index` still writes a row (`NULL`); old request shape
still 200s (contract test).

**Web** (`StudyPage.test.tsx`, existing mocked-`api` pattern): mode toggle + persistence;
ordinary-card Choice grading (correct→4, wrong→1); diagnostic-card authored options,
correct pick (no interlude), wrong routed pick (interlude shown, `option_index` sent, no
second `review` call on dismiss), wrong pick routed to `end` (no interlude); `deckCards`
fetch failure degrades gracefully; keyboard operability; locale parity.

## Files touched

Server: `study.controller.ts`, `study.service.ts`, `study.repository.ts` (tests
alongside).
Web: `api/client.ts`, `api/types.ts`, `pages/StudyPage.tsx`, new `pages/ChoicePanel.tsx`,
new `study/useStudyMode.ts`, `pages/StudyPage.test.tsx`, four `i18n/locales/*.json`.

## Next (separate from this design)

Phase 1 content pilot: author diagnostic cards (definitions + routed wrong-answer
remediation, e.g. impedance vs. resistance, G vs. C) into "Electronics Foundations (Art of
Electronics, Ch. 1)", re-reading the source chapter for accuracy, then a smaller pass on a
German verbs deck. Phases 2–4 (confidence rating, case scoring, web branch/case play) are
separate design docs, built in that order per the agreed sequencing.
