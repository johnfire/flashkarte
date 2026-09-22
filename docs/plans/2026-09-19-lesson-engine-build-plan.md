# Lesson engine — Build plan (DRAFT)

> Historical build record. It describes the implementation of what the product now calls **structured learning courses**; use the current authoring guides for behavior and terminology.

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

## Slice 3: web learner UI (M) — **DONE 2026-09-19** (see "What slice 3 decided and found" below)

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

## Slice 4: Android learner UI (L) — **DONE 2026-09-19** (see "What slice 4 decided and found" below)

The same flows in Compose, plus a Kotlin mirror of the shared logic with parity tests. Needs a
decision on offline behaviour (below). Compiled and unit-tested here; the screens themselves cannot
be looked at without an emulator, so that is stated plainly in the commit.

## Slice 5: images (S/M) — **DONE 2026-09-19** (see "What slice 5 decided and found" below)

Inline and expandable ("Show diagram", full-screen, pinch-zoom, return to the same scroll position)
on both platforms, and the **asset store**: SVGs stored in the database, cleaned by the server and served
as plain images (the same store later holds the rendered maths).

## Slice 6: typeset maths (M/L, depends on slice 0) — **DONE 2026-09-19** (see "What slice 6 decided and found" below)

Server-side rendering on save, stored SVG plus LaTeX plus spoken text; display formulas first, then
inline symbols. Verified in light and dark on both platforms, and by an accessibility check that
every formula has spoken text (required to finish a lesson, a warning while testing).

## Slice 7: "I need more on this" (M) — **DONE 2026-09-19** (see "What slice 7 decided and found" below)

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

## What slice 3 decided and found

Built and verified locally: 21 new component tests, 8 new server tests, a real-browser Playwright spec
with the axe accessibility check (light and dark), the whole e2e suite (24 pass), and the full lint,
format, typecheck, build, unit and integration sweep. Nothing pushed.

**What exists:** a **Learn** link on the deck list opens `/learn` (your subjects), then
`/learn/:subject` (the outline: modules, each lesson with its state in words, what a locked lesson
waits for, reviews due), then a lesson: numbered screens with Back and Next, the questions, the
wrong-answer loop, "come back later", open book, the passed screen, and a read-only "Read again" for a
passed lesson. `/learn/:subject/reviews` asks due questions one at a time. Every string is in English,
German, Spanish and French. Screens are drawn natively from blocks, never as markdown.

**Owner comments on a screen** (added because the pilot needs them): while learning, "Comment on screen
2.010" saves a note against that permanent number (migration 027). Your AI reads open comments with the
MCP tool `list_screen_comments`, answers them (usually with a clarifying screen numbered next to it) and
marks them done with `resolve_screen_comment`, recorded as the AI. Exported, erased with the account or the
screen, audited, in the GDPR record. The comment text is described to the AI as data, not instructions.

**Decisions taken while building** (flag any you disagree with):

1. **The verdict comes first, then the next step.** After an answer the reasons are shown and nothing
   moves until the learner presses Continue (or "Look at the screen again" after a miss), even though the
   server has already advanced.
2. **State is said in words** (Locked, Ready, In progress, Passed, "Come back later"), not colour alone;
   the right and chosen options are labelled "Right answer" and "Your answer".
3. **From the second miss** the learner sees why it may be the lesson rather than them, and "Come back
   later". The "I need more on this" button is **not there yet**: it arrives with help requests (slice 7).
4. **A locked lesson has no link** on the outline, and opening its address shows the server's message.
5. **Images and formulas are placeholders** for now (alt text; LaTeX with its spoken text) until slices 5 and 6.
6. **Reviews live at the subject** (`/learn/:subject/reviews`), reached from the outline's "N questions are due".

**Real bugs found before they shipped:**

- **"Re-read 0 of 1".** The server counts the re-taught screens from 0 and the page printed it as is. My
  component test had invented a 1-based value, so only the real-browser test caught it. Fixed and the test now uses the
  server's real value.
- **A test selector matched the reason text too** ("Right." also matched "This is right."); fixed by matching
  the verdict exactly. (Test-only.)

**Not in slice 3:** remembering scroll position within a screen (the place in the lesson is remembered;
a new screen starts at the top and moves keyboard focus to its heading); an owner-only view listing all open
comments in the app (your AI reads them through MCP; say if you want a screen for it); a Learn entry in the
Android app (slice 4); the entry check.

## What slice 4 decided and found

Built and verified locally: 25 new Android unit tests (261 in all, 0 failing), 7 on-device screen tests run
on an emulator, a debug build that launches, and a server test that pins the API's real responses. Nothing
pushed. **A push publishes the Android app to the Play internal track**, so this one needs your say-so
specifically.

**What exists:** the same flows as the web, drawn in Compose. A **Learn** button on the deck list opens
your subjects, then a subject's outline (state in words, what a locked lesson waits for, reviews due), then a
lesson: numbered screens with Back and Next, the question loop with the verdict and reasons held until you go
on, "come back later", open book, comment on a screen, the passed screen (result and what opened), "Read
again" for a passed lesson, and reviews. Every string is in English, German, Spanish and French.

**The offline decision (yours, still open), resolved by default to online-only:** the server holds each
learner's session and the rules, so the app is a renderer that sends "next", "back" or an answer and draws
the step it gets back, like Courses and the Library. That is why there is **no Kotlin copy of the lesson
rules and no parity tests**: there is only one copy of the rules. It also means lessons need a connection.
Downloading a whole lesson for offline study would need the rules on the device, a local database migration
and a sync change; that stays possible later and nothing here blocks it. Say if you want it.

**How the app and server are kept from drifting apart:** the server's own test captures the learner API's
real responses (every screen, question, answer, pass, pause, review, with every block type) into files under
`android/app/src/test/resources/learner-contract/`. That server test fails if a response changes shape
without the files being regenerated (`UPDATE_LEARNER_CONTRACT=1`), and the Android tests decode the same
files with the app's own types. Both the Android unit tests and the on-device tests use them.

**A block or step the app does not know is skipped, not a crash,** so a newer server never breaks an older
app (checked by a test).

**What I could and could not check on the emulator:** the screens were drawn on a device from the real
responses (scripted network, real repository, view models and screens) and I looked at the screenshots, in
light and dark. **I could not run the real app against a real server**: the app talks only to production over
a pinned certificate, so signing in and learning a lesson end to end on a phone has to be done by you on a
build from the internal track. TalkBack was not run (labels, headings and roles are set, but I have not
listened to it), and the emulator's tiny screen means the layout has not been judged on a real phone.

**Not in slice 4:** images and formulas are placeholders (alt text; LaTeX with its spoken text) until
slices 5 and 6; "I need more on this" until slice 7; scroll position within a screen is not remembered (a
new screen starts at the top).

## What slice 5 decided and found

Built and verified locally: sanitizer tests against known SVG attack forms (with mutation checks that
loosening it fails a test), real-Postgres integration and HTTP tests, web component tests, the Playwright
lesson spec with a real diagram (axe in light, dark and the open dialog), Android unit tests, and on-device
tests on the emulator with screenshots. Nothing pushed.

**What exists:** an AI (or you) stores a diagram with the MCP tool `create_image` and gets back a `src`
(`asset:<id>`) for an image block; `list_images` and `delete_image` complete it. Screens show it **inline**
or as an **expandable** diagram: a "Show diagram" button opens it full-screen with zoom (pinch on a phone,
buttons for anyone who cannot pinch) and closes back to the same place. On web the picture is fetched with
your sign-in and shown as a data URL; on Android it goes through an image loader that uses the app's own
signed-in client.

**Decisions taken while building** (flag any you disagree with):

1. **An allowlist sanitizer, not a blocklist.** Only known drawing elements and attributes survive. Scripts,
   event handlers, external links, `<style>`, `<image>`, embedded HTML and animation are removed, and the
   reply lists what was removed so the AI can fix its source. A file that is not well-formed SVG, has a
   DOCTYPE (so no entity tricks), lacks a `viewBox`, or is too large or deep is refused, not repaired.
2. **Several layers, not one.** Besides the sanitizer, pictures are shown as images (where scripts and outside
   requests never run), and the server serves them with a policy that lets nothing run or load.
3. **Stored diagrams need the sign-in to read**, even though they are only pictures. They belong to your private
   subject, so a leaked address shows nothing. Costs: the web client fetches them itself, and Android keeps
   them out of its disk cache.
4. **A diagram keeps a light background in dark mode** on both platforms, so one drawn with dark lines stays
   readable. (Maths in slice 6 can be inverted instead, because it is one colour.)
5. **A diagram in use cannot be deleted**, including when it appears in an old version of a screen, or in a
   question's option: point the screen at another image first. This keeps a finished lesson's history whole.
6. **300 images per subject and 200 KB each**, so a runaway loop is caught early.
7. **Lint:** an image pointing at a diagram the subject does not have is reported, and blocks finishing (not saving).

**Real bugs found before they shipped:**

- **The page's own security policy blocked the pictures.** Blob addresses are not allowed for images, so the
  diagram was in the page but drew nothing. Only the real-browser test against the production-style server
  showed it; the fix was to use data URLs, which the policy already allows, rather than loosen the policy.
- **The Android full-screen view's buttons ran off a narrow screen** (a label broke letter by letter and Close
  was pushed off). Only the emulator screenshot showed it; the controls now wrap.

**Not in slice 5:** typeset maths (slice 6, which reuses this store); uploading a photo or raster image (SVG
only, as the design said); scroll position within a screen; an in-app list of your images (your AI reads them
through MCP).

## What slice 6 decided and found

Built and verified locally: renderer tests including hostile TeX (with a check that the tests fail if the risky
packages are loaded), real-Postgres tests, shared tests, web tests, the Playwright lesson spec with real maths
(axe in light and dark), Android unit tests and on-device tests on the emulator with screenshots. Nothing pushed.

**What exists:** an AI (or you) writes a formula as plain LaTeX in a `formula` block for a line of its own, or in a
span with a `math` object for a symbol inside a sentence (`{"text":"d_k","math":{"spoken":"d sub k"}}`). When the
screen or question is saved, the server draws it once with MathJax and stores the picture (reused for the same
formula), and puts the picture's id and measured size on the block. Web and Android only draw a picture: they need
no maths engine. Display formulas scroll sideways if wide. Inline symbols sit on the text baseline (the spike's
finding, now real), and reserve their space while loading.

**Decisions taken while building** (flag any you disagree with):

1. **Inline maths is a span with a `math` object, and its LaTeX stays in `text`.** An older app that knows nothing
   about maths still shows the LaTeX as text, so nothing breaks or goes blank.
2. **Only the base and AMS LaTeX commands exist.** Commands that could load code, link out or inject markup
   (`\require`, `\href`, `\unicode`, `\class`, `\style`) are undefined, so they are refused with the reason. A
   formula that cannot be read is refused on save, naming the formula, so the AI fixes it and retries.
3. **The server always sets the picture and its size.** Anything an author supplies for them is discarded, so a
   block can never point at another subject's picture.
4. **Spoken text is a completeness rule** (needed to finish, not to save), for display formulas and inline
   symbols alike; `d_k` is read out as its spoken words.
5. **A symbol in a sentence is at most 300 characters;** a long formula belongs in its own block.
6. **Maths is tinted or inverted with the theme** (one colour); diagrams keep a light surface (decided in slice 5).
7. **The old picture stays when a formula is edited:** the store keeps drawn formulas for the subject (they are
   small); nothing removes unused ones yet.
8. **New dependency: `mathjax-full`.** `npm audit fix` cleared its transitive advisory (the spike's finding) and the
   audit is at 0. It adds roughly 50 MB to the server image and runs only when a screen is saved.

**Real findings:**

- **The sanitizer now always declares the `xlink` namespace** on the root, because a standalone SVG that uses an
  `xlink:` attribute without declaring it is refused by a browser. MathJax's output does not use it with the font
  cache off, but the sanitizer must not depend on that.
- **The LaTeX allowlist test would not have caught loading `\href` by adding the package name alone** (MathJax
  needs the module imported), so I checked the test really fails when the modules are imported.

**Not in slice 6:** matrices and multi-line derivations (not tested); an inline symbol wrapping at a line end (it is
a picture, so it cannot break); TalkBack and screen-reader reading of the spoken text on a phone (labels are set,
not listened to); text selection or copying from a formula; a way to remove unused formula pictures.

## What slice 7 decided and found

Built and verified locally: real-Postgres tests of the whole request-and-answer cycle, an HTTP test with the AI
key, MCP tool tests, web component tests, the Playwright lesson spec (axe), Android unit tests (278) and 18
on-device tests with screenshots. Nothing pushed.

**What exists:** on any screen, and on a question the learner keeps missing, **I need more on this** takes an
optional note (and, on the web, the passage they had selected) and puts a request in a queue. Because MCP is
pull-only, the screen says plainly that it waits for your AI, and offers **a ready-made message to copy** for
your AI if you do not want to wait. Your AI reads the queue with `list_help_requests` and answers with
`answer_help_request`: **one to three short screens, each with at least one source**, inserted right after the
screen you asked about (for example 2.010, 2.020), recorded as written by the AI, in one step that also marks the
request answered. You see "Answered: see 2.010" on the screen you asked from, and each new screen says **"Added by
your AI in answer to your question"** and lists its sources (only https links are followable). It works on a
finished lesson, because inserts are safe there. Exported, erased with the account, audited (the AI's answer is
recorded as `ai-agent`), in the GDPR record.

**Decisions taken while building** (flag any you disagree with):

1. **Help requests share the queue with the screen comments from slice 3** (one table, one queue for your AI, a
   `kind` to tell them apart), rather than a second near-identical mechanism. `answer_help_request` works on a
   comment too.
2. **An answer must cite sources** (a title, and a link where there is one): the tool refuses a screen without
   one. This is the design's "with sources", enforced.
3. **At most three screens per answer,** so an answer stays short. More is a new lesson, not an answer.
4. **At most 50 open requests per subject,** so a runaway loop is caught.
5. **A question's request is about the screen that teaches it** (the first one), and remembers the question.
6. **The label is only for screens made to answer a request.** A whole lesson your AI drafted is not labelled on
   every screen, though every AI-drafted screen still records who wrote it and lists any sources under "N sources".
7. **Private notes for someone who does not own the subject are not built:** today a learner is always the owner, so
   an answer always becomes real screens. That comes with cloning and other learners.

**A real bug found by the new tests:** a screen number that is not a number ("abc", "1..2") reached the database as
one it could not read and came back as a server error, in the comment feature from slice 3 as well as the new one.
It is now a "not found" (with a test).

**Not in slice 7:** the learner cannot see a list of everything they have asked (each request shows on its own screen);
answering a request asked from a review (the button is on lessons only); a way to withdraw a request.
