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

## Slice 0: spikes (no product code, S)

Answer the two questions the design admits it hasn't proven, before anything depends on them.

1. **Maths.** Render a handful of real formulas (softmax, `Q Kᵀ / √d_k`, `R = V/I`, a sum with
   subscripts) to SVG on the server; display them on web and in Compose; check light and dark, and
   an inline symbol on a text baseline. **Exit:** a short written finding and a go/no-go on
   server-side SVG. If no-go, the fallback is images made by hand for the few formulas that need them.
2. **Decimal numbering.** Prove exact-decimal ordering and insertion in Postgres, and write the
   pure "suggest a number between two neighbours" function with property tests (always strictly
   between, never collides, any gap splittable). **Exit:** the function and tests, kept.

## Slice 1: content model and authoring (M)

Migrations for modules, lessons, screens, questions and their links; **shared TypeScript** for
block validation and the lint from section 6 of the spec; testing/finished stage rules enforced
server-side; MCP tools to author (create module and lesson, add screen, add question, set
prerequisites, set stage); a derived outline endpoint. Reuses the existing subject, ownership,
audit-log and account-export patterns.

- **Verified by:** integration tests against real Postgres (constraints, ownership, stage rules,
  lint failures, a numbering insertion between existing screens); MCP tool tests; the derived
  outline matches the lesson graph.
- **Usable when done:** an AI can author a small lesson through MCP. No learner UI yet.

## Slice 2: the learner engine (M)

The rules, as **pure shared logic** with exhaustive tests: lesson progress, the question loop (wrong
answer → teaching screen → re-ask), pass, unlocking, outline states, and the adapter that feeds
question reviews into the existing scheduler. Endpoints to read a lesson, record screen reads and
question answers, and fetch the outline with the learner's states. A "walk" test (like the
Transformers one) drives a learner through a whole subject to prove nothing deadlocks and nothing
unlocks early.

- **Verified by:** unit tests of every transition; real-Postgres integration tests; the walk test.
- **Decision needed first:** the pass-loop escape hatch (see below).

## Slice 3: web learner UI (M)

Outline, screen reader (number shown, Back/Next, position remembered), questions and the loop,
lesson-passed state, review of due questions. Text, lists, code and callouts only at this stage.

- **Verified by:** component tests, and a Playwright spec that authors a small lesson, learns it
  in a browser, fails a question on purpose and is sent back to the right screen, passes, and sees
  the next lesson unlock; axe WCAG A/AA on the outline, a screen and a question.

## Content pilot (starts once slice 3 works; runs alongside)

Author **one module of Transformers** (about 6 to 8 lessons, so roughly 40 to 60 screens) with AI
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
on both platforms.

## Slice 6: typeset maths (M/L, depends on slice 0)

Server-side rendering on save, stored SVG plus LaTeX plus spoken text; display formulas first, then
inline symbols. Verified in light and dark on both platforms, and by an accessibility check that
every formula has spoken text.

## Slice 7: "I need more on this" (M)

Help requests, an MCP tool for the user's AI to read and answer them, real screens for the owner and
private notes for everyone else, AI labelling and sources, export, deletion and the GDPR record.

## Slice 8: in-app AI with the learner's own key (only if decided)

Depends entirely on the decision in section 9 of the spec. Not planned until Chris decides.

## Decisions needed before slice 1 or 2

1. **Pass-loop escape hatch.** What happens when a learner keeps failing a lesson? Options: nothing
   (they loop until they pass); after N misses, offer "I need more on this" prominently; allow skipping
   with the lesson marked as not passed (dependents stay locked).
2. **Android offline.** Lessons read online only, or downloaded whole and progress queued offline like
   reviews? Offline progress needs a local migration and a sync change (the same trade-off as reading
   cards, which chose best-effort).
3. **Lesson-level graph.** How the concept edges collapse into lesson edges (a bundle's outside
   prerequisites, keeping each written reason) and who reviews the result.
4. **Question types after multiple choice** and when: ordering and calculation are the next two.
5. **In-app AI** (spec section 9).

## What I am least sure of

The maths pipeline and inline maths on Android (spike first); the size of the content work; and
whether lessons of 4 to 10 screens are the right grain, which only the pilot can tell us.
