# Lesson engine — Build plan (DRAFT)

_Date: 2026-09-19 · Status: **draft for Chris to review. Nothing is started.**
Companion to [the design spec](2026-09-19-lesson-engine-design.md); read that first._

## How we work

- **One slice at a time**, each a few commits, each usable and testable on its own. Nothing is
  pushed until Chris says so. A push deploys to production and Android changes publish to the Play
  internal track, so pushes are a decision, not a default.
- **Additive only:** new tables and routes; no existing table, route or client contract changes, so
  Android builds in the field and the flashcard flows are unaffected.
- **Every slice is verified before it is called done:** real-Postgres integration tests for
  anything that touches the database; a real-browser Playwright spec (with the axe accessibility
  check) for anything a learner sees on web; Android unit tests plus a compiled build; TS and Kotlin
  parity tests for any shared logic Android also runs. Where a check can't be run (for example an
  Android screen with no emulator here) the slice says so in its commit.
- Sizes are relative (S/M/L), not time estimates. I do not have a basis for dates.

## Slice 0: spikes (S) — **DONE 2026-09-19, both GO** ([findings](2026-09-19-lesson-engine-spikes.md))

Answer the two questions the design admits it hasn't proven, before anything depends on them.

1. **Maths.** Render a handful of real formulas (softmax, `Q Kᵀ / √d_k`, `R = V/I`, a sum with
   subscripts) to SVG on the server; display them on web and in Compose; check light and dark, and
   an inline symbol on a text baseline. **Exit:** a short written finding and a go/no-go on
   server-side SVG. If no-go, the fallback is images made by hand for the few formulas that need them.
2. **Decimal numbering.** Prove exact-decimal ordering and insertion in Postgres, and write the
   pure "suggest a number between two neighbours" function with property tests (always strictly
   between, never collides, any gap splittable). **Exit:** the function and tests, kept.

## Slice 1: content model and authoring (M) — **DONE 2026-09-19** (see "What slice 1 decided" below)

Migrations for modules, lessons, screens, questions (with their variants and their list of teaching
screens) and their links; **shared TypeScript** for
block validation and the lint from section 6 of the spec; per-lesson testing/finished stage rules enforced server-side (including the revision history, retiring a
screen, and the two levels of checks: structural on every save, completeness at finish); MCP tools to author (create module and lesson, add screen, add question, set
prerequisites, set stage); a derived outline endpoint. Reuses the existing subject, ownership,
audit-log and account-export patterns.

- **Verified by:** integration tests against real Postgres (constraints, ownership, stage rules,
  lint failures, a numbering insertion between existing screens); MCP tool tests; the derived
  outline matches the lesson graph.
- **Usable when done:** an AI can author a small lesson through MCP. No learner UI yet.

## Slice 2: the learner engine (M) — **DONE 2026-09-19** (see "What slice 2 decided and found" below)

The rules, as **pure shared logic** with exhaustive tests: lesson progress, the question loop (wrong
answer → teaching screens → re-ask a different variant, or from the back of the set with options
shuffled), pass, unlocking, outline states, and the adapter that feeds
question reviews into the existing scheduler. Endpoints to read a lesson, record screen reads and
question answers, and fetch the outline with the learner's states. A "walk" test (like the
Transformers one) drives a learner through a whole subject to prove nothing deadlocks and nothing
unlocks early.

- **Verified by:** unit tests of every transition; real-Postgres integration tests; the walk test.
- **Decision needed first:** the pass-loop escape hatch (see below).

## Slice 3: web learner UI (M)

Outline, screen reader (number shown, Back/Next, position remembered), questions and the loop,
lesson-passed state, review of due questions, and an owner-only "comment on this screen" (a note
kept against the screen number) so the testing stage is usable: Chris will review by learning the
subject himself. Text, lists, code and callouts only at this stage.

- **Verified by:** component tests, and a Playwright spec that authors a small lesson, learns it
  in a browser, fails a question on purpose and is sent back to the right screen, passes, and sees
  the next lesson unlock; axe WCAG A/AA on the outline, a screen and a question.

## Content pilot (starts once slice 3 works; runs alongside)

Author **one module of Transformers, "Input side: text to vectors"** (about 10 concepts, so roughly
4 lessons and 20 to 40 screens) with AI
drafting and Chris reviewing every screen and question. This is the first real test of the design:
whether 4 to 10 screens per lesson is right, whether the questions test what was taught, and
whether the lesson-level graph derived from the concept graph is sensible. Findings feed back
before more slices are built on top.

## Slice 4: Android learner UI (L)

The same flows in Compose, plus a Kotlin mirror of the shared logic with parity tests. Needs a
decision on offline behaviour (below). Compiled and unit-tested here; the screens themselves cannot
be looked at without an emulator, so that is stated plainly in the commit.

## Slice 5: images (S/M)

Inline and expandable ("Show diagram", full-screen, pinch-zoom, return to the same scroll position)
on both platforms, and the **asset store**: SVGs stored in the database, cleaned by the server and served
as plain images (the same store later holds the rendered maths).

## Slice 6: typeset maths (M/L, depends on slice 0)

Server-side rendering on save, stored SVG plus LaTeX plus spoken text; display formulas first, then
inline symbols. Verified in light and dark on both platforms, and by an accessibility check that
every formula has spoken text (required to finish a lesson, a warning while testing).

## Slice 7: "I need more on this" (M)

Help requests, an MCP tool for the user's AI to read and answer them, real screens for the owner and
private notes for everyone else, AI labelling and sources, export, deletion and the GDPR record.

## Slice 8: in-app AI with the learner's own key (only if decided)

Depends entirely on the decision in section 9 of the spec. Not planned until Chris decides.

## Decisions needed before slice 1 or 2

1. ~~**Pass-loop escape hatch.**~~ **Decided:** after two misses on the same question the learner is
   offered "I need more on this" and "come back later" (saved, not passed, dependents stay locked);
   misses are recorded against the question so the owner can see which ones fail.
2. **Android offline.** Lessons read online only, or downloaded whole and progress queued offline like
   reviews? Offline progress needs a local migration and a sync change (the same trade-off as reading
   cards, which chose best-effort).
3. **Lesson-level graph.** How the concept edges collapse into lesson edges (a bundle's outside
   prerequisites, keeping each written reason) and who reviews the result.
4. **Question types after multiple choice** and when: ordering and calculation are the next two.
5. **In-app AI** (spec section 9).
6. **Entry check and test-out** (spec section 13): whether a failed readiness check recommends a
   primer or blocks the learner. It fits right after slice 2 as a small addition, since it reuses the
   question engine.

## What I am least sure of

The maths pipeline and inline maths on Android (spike first); the size of the content work; and
whether lessons of 4 to 10 screens are the right grain, which only the pilot can tell us.

## What slice 1 decided and found

Built and verified locally (real-Postgres integration tests, route tests, a real-HTTP test, and the MCP
tools registered on the real MCP SDK). Nothing pushed.

**Decisions taken while building** (flag any you disagree with):

1. **Paragraph text is a list of spans** (text plus bold, italic or code flags), not markup in a string,
   so there is no parser to keep in step between web and Android.
2. **A variant holds only its own wording.** Its teaching screens and tested concepts are its question's, so
   they cannot disagree; the lint rule "variants match" became unnecessary.
3. **A lesson can only be taught by its own screens.** A question cannot point at another lesson's screen.
4. **In a finished lesson:** inserts, edits (with revision history), new questions and variants, retiring a
   screen, and re-pointing a question are allowed. Deleting, renumbering, changing what the lesson covers,
   changing its prerequisites, and deleting a question (retire it instead) are not. A lesson cannot go back
   from finished to testing.
5. **A screen is retired, not deleted,** and only after no active question teaches it. A screen a question
   teaches cannot be deleted even in the testing stage.
6. **A write made with an AI key is recorded as AI-authored,** on the screen and as `ai-agent` in the audit log.
7. **Numbers continue after the subject's highest** when a new lesson is created, so screen numbers stay
   unique across the subject without the author choosing any.
8. **A lesson's module is optional;** lessons without one appear in a trailing group in the outline.

**A real bug found and fixed before it shipped:** the constraint that stops a taught screen being deleted
made an account with lessons impossible to erase, because deleting a lesson, subject or account removes its
screens before its questions and an immediate check refuses the cascade. It is now a deferred constraint:
whole-account deletion works and deleting just a taught screen still fails. This is the reason the account
deletion check exists.

**Proven with real content:** the first Transformers lesson ("Tokens and the vocabulary": 5 screens, 4
questions, each with a variant, 4 concepts) imports through the authoring path, lints with no issues, finishes,
and appears in the outline. It is **draft content for you to review**, not finished teaching; it lives at
`packages/server/src/domains/lessons/fixtures/transformers-tokens-lesson.json`.

**Not in slice 1, by design:** a learner's progress (locked, in progress, passed) on the outline, the asset
store and image uploads (slice 5), formula rendering to SVG (slice 6), private notes and help requests
(slice 7), and any screen a learner can see (slice 3).

## What slice 2 decided and found

Built and verified locally (shared unit tests, real-Postgres integration tests, a real-HTTP test, route
tests, mutation checks on the risky guards, and the full lint, format, typecheck, build and test sweep).
Nothing pushed.

**What exists:** the rules as pure shared logic (session state machine, lesson unlocking, review
scheduling); migration 026 (`lesson_progress`, an append-only `question_attempts` ledger,
`question_reviews`); a server-authoritative learner session; `/api/subjects/:id/learn/...` for the
outline, each lesson step (start, step, next, back, answer, continue, pause, resume, open-book screens)
and reviews (list due, start, answer, continue, pause); owner-only question insights
(`/lessons/:slug/insights`, and an MCP tool `get_question_insights`); audit entries for starts, answers
and passes; account export of progress, every answer and the review schedule; erasure with the account
and with a deleted lesson.

**Decisions taken while building** (flag any you disagree with):

1. **A step never contains the answer.** A question step carries the prompt and the options in shown
   order, with no correctness and no reasons; both are revealed only in the reply to the answer.
2. **The server holds the session.** A client sends "next", "back" or an answer and renders the step it
   gets back. The rules exist once, in `packages/shared`, and Android will mirror them with parity tests.
3. **A lesson opens only when every prerequisite is passed.** A lesson that is paused ("come back
   later") counts as in progress, so its dependents stay locked. Passing reports exactly which lessons it
   opened.
4. **Going back on the first screen stays on the first screen** rather than being an error.
5. **A review asks one question, alone.** A miss shows that question's teaching screens, then asks
   again; the first attempt of the review sets the next interval (right 4, wrong 1) on the existing
   fixed-cadence scheduler.
6. **Learner routes refuse an AI (deck-scoped) key.** The AI authors lessons and can read where
   questions fail, but does not take lessons for the person.
7. **Learners are the subject's owner for now.** Using someone else's public subject comes with cloning.
8. **Audit against the subject,** with the lesson slug or question id in the detail, because the audit
   target must be a uuid.
9. **A learner's saved session is brought in line with edits** to the lesson (a screen added or retired,
   a question added) each time it is read, so editing a lesson never strands someone mid-lesson.

**Real bugs found and fixed before they shipped:**

- **Reviews pulled in the whole lesson.** The first review of a question in a lesson with several
  questions did not finish after a right answer, because catching a saved session up to the lesson's
  content re-added the lesson's other questions. Caught by the whole-subject walk test (a one-question
  lesson hid it). Fixed by narrowing a review to its one question; a test fails if that is removed.
- **Audit entries were silently lost.** They were addressed to a lesson slug, but the audit target must be
  a uuid, and the audit service swallows write failures by design. Caught by a test that reads the audit
  table back rather than trusting the call.
- **Concurrent queries on one connection.** Loading a lesson inside a transaction ran queries in
  parallel on a single connection, which the database driver deprecates. They now run one after the other.

**Proven by the walk test:** a learner passes a six-lesson subject with a diamond and a join in prerequisites,
under five random orders with wrong answers along the way; nothing opens early, what a pass reports as
unlocked is exactly what opened, no learner is ever stuck; then 60 days later all 18 questions come back
for review, and a miss is recorded in the ledger. The real Transformers "Tokens and the vocabulary"
lesson is also learned end to end through the learner path (with one deliberate miss).

**Not in slice 2, by design:** any screen a learner sees (slice 3); the entry check or test-out (it fits
right after slice 2, since it reuses the question engine: still your decision on recommend versus block);
help requests (slice 7).
