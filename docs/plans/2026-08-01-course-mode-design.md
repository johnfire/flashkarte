# Course Mode — Design

**Date:** 2026-08-01 · **Status:** validated design, not yet specced into PRs
**Supersedes nothing.** Extends [`docs/learning-engine-ideas.md`](../learning-engine-ideas.md)
and the spec pack in [`docs/specs/`](../specs/README.md).

---

## 1. Why

flashkarte can only test what you learned somewhere else. There is no path from "I know
nothing about X" to "I have a deck about X I can drill." Everything in the app assumes the
learner arrived already-taught.

This design closes that gap by making **lessons first-class**: a course is a structured
sequence of teach-then-test units, with spaced repetition running underneath it rather than
beside it.

### Starting state (verified 2026-08-01)

- **Spec 01, diagnostic answers — shipped.** `packages/shared/src/study/diagnostic.ts`,
  `android/.../domain/study/DiagnosticStudy.kt`, migration `013_review_events_option_index.sql`.
  Which wrong option a user picked is already recorded, and currently unused.
- **Specs 02–08 — not shipped.** No confidence column, no `@concept`/`@depth`, no FSRS, no
  `path_events`, no MCP study tools.
- **Web has no diagnostic MC path.** `packages/web/src/pages/StudyPage.tsx` does not consume
  `selectOptions`/`resolveChoice`. The Android-vs-web drift warned about in
  [`00-guardrails.md`](../specs/00-guardrails.md) has not narrowed.

### The tension this design resolves

Putting instructional content on the _front of a card_ would convert active recall into
reading comprehension, destroying the retrieval effort that makes spaced repetition work.
The resolution is to **separate the teaching moment from the testing moment**, and to make
lessons **pulled by failure, not pushed by position** — you see a lesson on first encounter
and again when you have forgotten it.

---

## 2. Decisions

| #   | Decision                                                          | Rationale                                                                                                     |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| D1  | Lessons are first-class; courses are a real entity                | Chosen over "retrieval-first with a teaching on-ramp"                                                         |
| D2  | A course is a **manifest over existing decks**                    | Every existing deck becomes a reusable lesson; AI revises one lesson at a time; small diffs and sync payloads |
| D3  | Teach content lives in the **lesson deck file**, not the manifest | Keeps the manifest thin and each lesson self-contained/reusable                                               |
| D4  | SM-2 state stays **global per `(user, card)`**                    | A card in two courses has one memory state; course progress is a separate layer                               |
| D5  | **Quiz to advance, spaced review underneath**                     | Immediate progression in one sitting, without abandoning the memory engine                                    |
| D6  | **Mode is a UI surface, not a data universe**                     | Course mode and traditional mode read/write the same `card_progress`; nothing forks                           |
| D7  | v1 courses reference **your own decks only**                      | Public/shared courses are a separate problem; deferred                                                        |

### Rejected

- **Mastery-gated progression** (unlock on stability ≥ N days) — spaced repetition is slow by
  design; locks out exam-deadline learners for days with nothing to do.
- **Open/no gating** — degrades to a playlist with stats, weakening the case for a course model.
- **Per-course author-chosen gating mode** — every client must implement all modes; defers the
  product decision instead of making it.
- **One-file-per-course** — course files get very long, no lesson reuse, every AI edit rewrites
  the whole document.
- **A visual course editor** — markdown stays the source (per ideas doc §3). Invest in
  validation errors with line numbers instead.
- **Hosting video** — storage, bandwidth, transcoding, DMCA. URL reference only.
- **In-app AI grading** — AI compute stays on the user's own account. `@keypoints` (§6) is what
  makes this acceptable rather than limiting.

---

## 3. Content model & format

### Course manifest

A markdown file marked by `@course`, parsed by a separate `parseCourse()` entry so it cannot
collide with deck parsing:

<!-- prettier-ignore -->
```text
# Neuroanatomy Basics
@course
@pass 80

## Module 1 — Gross Structure
- Cerebral Lobes -> deck:cerebral-lobes
- Brainstem -> deck:brainstem

## Module 2 — Pathways
- Corticospinal Tract -> deck:corticospinal
```

Deliberately minimal new syntax:

- `## H2` is the **module** level — the same heading the parser already tracks as category.
- Lesson references reuse the **existing** `- text -> target` option line via `matchOption()`,
  with a new `deck:` target namespace resolved through `packages/shared/src/slug.ts`.
- Net new: two directives (`@course`, `@pass`) and one target namespace.

### Lesson deck file

An ordinary deck — so every existing deck is already a valid lesson. Teach content is additive:

<!-- prettier-ignore -->
```text
# Cerebral Lobes

@teach
The cortex divides into four lobes...
![Lobe map](https://example.org/lobes.png)
!video[Overview](https://example.org/lobes.mp4#t=90,180)
@keypoints
- Four lobes: frontal, parietal, temporal, occipital
- Central sulcus separates frontal from parietal
- Occipital is primary visual cortex
@endteach

## Frontal Lobe
**1. What does the frontal lobe do?**
Executive function, motor planning...
```

A `@teach` block attaches to the section it opens; at top-of-file it covers the whole lesson.

**Video is segment-scoped** (`#t=start,end`). A 40-minute lecture is 200 ideas; a card is one.
Segment references are what make video cardable.

### The gating quiz is generated, not authored

It samples N cards from the lesson and runs them through the shipped diagnostic MC path. No
duplicate authoring, and the quiz is by construction "can you retrieve what this lesson
taught." An explicit `@quiz` section remains available as an override.

### Parity cost

`@course`, `@pass`, `@teach`, `@keypoints`, `@endteach`, `!video[]` and `deck:` each need
TS + Kotlin + `fixtures/parser-cases.json`. That is the bill for lessons-first.

---

## 4. Progress & data model

Two layers that never mix.

**Memory layer — unchanged.** `card_progress` + `review_events` stay global per
`(user, card)`. No migration touches these beyond adding columns.

**Course layer — new, following the existing ledger pattern:**

| Table            | Shape                                                                         | Notes                                                     |
| ---------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| `courses`        | id, user_id, slug, title, source_md, pass_threshold                           | the manifest, stored like a deck                          |
| `course_lessons` | course_id, module, position, deck_id                                          | derived from parse; rebuilt on manifest save              |
| `quiz_attempts`  | **attempt_id (PK)**, user_id, course_id, deck_id, attempted_at, score, passed | immutable + idempotent — same contract as `review_events` |
| `lesson_state`   | user_id, course_id, deck_id, taught_at                                        | the one fact quizzes cannot record: "I read the lesson"   |

### Unlock state is derived, never stored

"Lesson N is available" = _the previous lesson by position has a passing attempt_. This is a
pure function in `packages/shared`, so web and Android are thin renderers — the shared-logic
rule from the guardrails is satisfied by construction rather than by discipline.

### A quiz attempt double-writes

It emits one `quiz_attempts` row **and** N `review_events` rows, each `event_id` derived
deterministically from `attempt_id + card_id`. Consequences:

- The memory engine is fed by course work automatically.
- There is no parallel scoring universe to reconcile.
- Replay stays idempotent, so offline sync needs no new logic — `quiz_attempts` joins the
  existing outbox (`android/.../data/repository/OutboxRepository.kt`).

### "Stats on key points"

Aggregate card stability grouped by `@concept` across a course's lessons, reported against the
lesson's declared `@keypoints`. **This makes spec 06 a hard dependency, not a nice-to-have.**

---

## 5. Study flow

Because memory state is global per card, **mode is a UI surface, not a data universe**.

### Traditional mode — today's flow, unchanged

Pick a deck, drill what is due. Two additions only:

- Cards belonging to course lessons appear here like any other due cards.
- A deck carrying `@teach` does **not** push exposition on entry — the lesson is a collapsed
  affordance you can open. Someone drilling is drilling.

### Course mode — new surface

Course → modules → lessons, with a "continue" entry point. A lesson session runs four steps:

1. **Teach** — text/video/images. Stamps `taught_at` on first view. Skippable.
2. **Practice** — the lesson's cards, ungated, unscored. Writes `review_events` normally,
   because it is genuine retrieval.
3. **Assessment** — N sampled cards via the shipped diagnostic MC path. Writes the
   `quiz_attempt` plus its derived review events.
4. **Debrief** — score, missed items grouped by `@concept`, coverage against `@keypoints`,
   next lesson unlocked or retry offered.

### Where due reviews surface

A course session **opens with due cards from lessons already passed in that course**, then
moves into new material — warm up on prior work, then advance. Traditional mode meanwhile shows
everything due across all decks, course-owned or not.

No double-counting is possible: answering a card in either place is the same memory state, so
it stops being due in both.

### Teach content is pulled by failure

Rate `Again` on a card whose section has a `@teach` block, and the debrief offers "re-read the
lesson" inline.

### Client dependency

Web has no diagnostic MC path at all, so **course mode on web requires spec 08 first**.
Otherwise course mode ships Android-only and widens exactly the drift the guardrails forbid.

---

## 6. MCP & authoring

The manifest choice pays off here: **the existing five deck tools become lesson-authoring tools
unchanged.** An AI writes or revises one lesson file at a time instead of rewriting a
3000-line course.

**New write tools:** `create_course`, `update_course` — both operate on a manifest of a few
dozen lines.

**The composing workflow:** _outline first_ (AI writes the manifest — modules, lesson titles),
then _fill_ (one `create_deck` per lesson, each with its `@teach` block and cards). Resumable:
a failure halfway leaves a valid course with some lessons pending, not a corrupt document.

**Read tools close the loop** (spec 05, extended for courses):

- `get_course_progress`
- `get_struggling_concepts`
- `get_confusion_pairs` — mined from `option_index`, **already collected and unused**

The payoff: the AI sees you failed lesson 3's quiz twice on the same concept and rewrites that
lesson's teach block or inserts a remediation lesson. That is the actual "educate someone on a
subject" mechanism, and it needs no new data collection.

### `@keypoints` — one declaration, three uses

1. The debrief reports coverage against them.
2. The concept rollup groups by them.
3. The AI generates cards from them.

It also enables **self-graded free recall** with no AI and no network: write your explanation,
then reveal the key points and tick which you actually hit. Coverage → rating.

### Anti-fragility rule for authoring

A manifest referencing a missing or deleted deck marks **that lesson** unavailable and leaves
the rest of the course fully working. One broken lesson never breaks a course.

---

## 7. Failure modes

The rule: **author error never locks out a learner.**

| Situation                          | Behavior                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| Manifest references a missing deck | That lesson unavailable; rest of course works                                       |
| Manifest fails to parse            | Save rejected with line numbers; **existing stored course keeps serving**           |
| Lesson has fewer than N cards      | Sample `min(N, available)`; zero cards → teach-only lesson, ungated                 |
| Quiz interrupted offline           | `attempt_id` minted client-side; only completed attempts persist; replay is a no-op |
| Video URL dead or blocked          | Teach block renders text with a media notice — progression never gates on media     |
| Clock skew on replay               | Order by `attempted_at` per `(user, course, deck)`, as `review_events` already does |

No cycles are possible by construction: courses reference decks, decks never reference courses.

### Privacy constraint on video

A raw YouTube embed sets cookies before consent, which given [`docs/gdpr/`](../gdpr/) cannot
ship. Use `youtube-nocookie` with click-to-load, or self-hosted mp4 URLs.

---

## 8. Back-compat

Required by the guardrails, stated explicitly:

- New columns nullable/defaulted. Migrations start at **`018`** (latest is
  `017_email_change.sql`).
- `/api/study/sync` keeps accepting the current payload shape. Old Android APKs will be in the
  field for months and simply never see courses.
- The manifest model helps: **lesson decks are ordinary decks**, so old clients study them
  normally.

**Known wart:** old parsers render `@teach` and `!video[]` as literal body text. Not a crash,
but ugly. Either the server strips teach blocks for old client versions, or the cosmetic
degradation is accepted until adoption catches up. **Recommendation: accept it** —
version-sniffing the parser is worse than the wart.

---

## 9. Testing

- **Parser:** `@course`, `@teach`, `@keypoints`, `!video[]`, `deck:` targets get corpus cases in
  `fixtures/parser-cases.json`, TS + Kotlin in the same PR. Python stays frozen — note the
  divergence in the corpus comments.
- **Shared:** the unlock-derivation function is the highest-risk logic in the design.
  Table-driven tests, both ports.
- **Idempotency:** replay a quiz attempt twice → one `quiz_attempts` row, N `review_events`,
  `card_progress` unchanged. This is the test that protects offline sync.
- **Server** Jest · **web** Vitest · **Android** JUnit — follow neighbours' patterns.
- **e2e:** `course-lifecycle.spec.ts` alongside [`e2e/account-lifecycle.spec.ts`](../../e2e/account-lifecycle.spec.ts)
  — create → teach → quiz → unlock.
- **a11y:** extend [`e2e/a11y.spec.ts`](../../e2e/a11y.spec.ts) — video needs captions and real
  controls; teach content must be keyboard-navigable.

---

## 10. Build order

Dependencies surfaced by this design:

1. **Spec 06 — `@concept`** (hard prerequisite for key-point/concept stats)
2. **Spec 08 — web parity for diagnostic MC** (hard prerequisite for course mode on web)
3. Parser additions (`@course`, `@teach`, `@keypoints`, `!video[]`, `deck:`) — TS + Kotlin + corpus
4. Course data layer (migrations 018+, derived unlock function in `packages/shared`)
5. Course mode UI — web and Android together

Specs 06 and 08 are now prerequisites, not optional items on a shelf.

## 11. Open questions

1. **Quiz sample size N and `@pass` default** — 80% of how many cards? Needs a real deck to tune.
2. **Re-quiz policy** — unlimited retries, cooldown, or resample on retry to prevent
   answer memorisation?
3. **Course-level completion** — is there a "course complete" state, and does it mean anything
   beyond all lessons passed?
4. **Does practice (step 2) count toward the quiz sample?** Practising a card then being
   assessed on it minutes later measures short-term memory.
