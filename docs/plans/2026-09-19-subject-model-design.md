# Subject model — Design

> Historical design record. It uses earlier terminology; current product documentation distinguishes **flashcard decks**, **flashcard deck collections**, and **structured learning courses**.

_Date: 2026-09-19 · Scope: shared + server + MCP first, then web + Android · Builds on
[the authoring strategy](2026-09-19-course-authoring-strategy.md) and
[the Transformers DAG](2026-09-19-transformers-concept-dag.md). Decisions taken by Chris on
2026-09-19: shape-first, the graph lives behind the API/MCP, concepts are cross-deck._

## Goal

Give flashkarte a first-class **prerequisite graph per subject** so the app can decide what
a learner should study next, and send them back to the right prerequisite when they fail.
Spaced repetition stays as the retention layer inside that; it stops being the whole
product. Courses (gated deck paths) keep working unchanged.

## Current state (verified 2026-09-19)

- Courses gate per **deck**: deck _i_ unlocks when every card in deck _i−1_ has
  `card_progress.repetitions >= STABLE_REPS` (`courses.service.ts`).
- Spec 06 (`@concept`/`@depth`, one deck only) is designed and unbuilt.
- No concept, edge or card-to-concept link exists anywhere.
- Diagnostic multiple choice, remediation routing and sense blocks exist end to end (TS,
  Kotlin, web, Android).
- `STABLE_REPS = 3`, defined in `packages/shared/src/study/senses.ts`, is the only stability
  threshold. `interval_days` must not be used (fixed-cadence scheduler, 2026-09-10).

## Data model

Four new tables (migration `023_subjects.sql`), additive only.

- `subjects`: `id`, `user_id` (owner), `title`, `description`, `is_public`, `version`
  (bumped on every graph edit, so a learner's view can be tied to a graph revision),
  timestamps.
- `concepts`: `id`, `subject_id`, `slug` (stable, human-readable, unique per subject:
  `kv-cache`), `name`, `kind` (`term | idea | skill | map | capstone | assumption`), `tier`
  (`core | extension`), `position` (authoring order, the tie-break that keeps the route
  deterministic). Progress is keyed to the concept, so reshuffling decks or editing the
  graph never loses anyone's progress.
- `concept_edges`: `from_concept` (the prerequisite), `to_concept` (the dependent),
  `strength` (`requires | suggests`), `reason` (required for `requires`, enforced by a DB
  CHECK as well as the API). The schema allows edges across subjects, so a course's entry
  floor can later point at another subject's concepts; **the API currently keeps both ends
  in one subject**. An edge is a claim by the dependent concept's author, so only the owner
  of that subject may add or remove it.
- `card_concepts`: `card_id`, `concept_id`. Cross-deck: a concept's items may live in any
  of the owner's decks.

Not stored: units, mastery, frontier. A **unit** is a route decision (a course-level cut),
so it belongs with courses. **Mastery is computed on read** from `card_progress`, as
Courses already does, so nothing can drift out of sync with real study state.

`assumption` concepts are placeholders for things the subject does not teach (matrix
multiplication for Transformers). Later they can be resolved to a real concept in another
subject; until then they never block.

## Graph logic (`packages/shared/src/graph/`, pure, no I/O)

Per the shared-logic guardrail, all graph semantics live in `packages/shared` and clients
stay thin renderers. Kotlin gets a mirror when Android consumes it (step 6).

- `wouldCreateCycle`, `topologicalOrder` (deterministic: ties broken by input order),
  `prerequisiteLevels`.
- `lintConceptGraph`: unknown concept, self edge, cycle, `requires` without a reason,
  more than 4 `requires` parents on a non-capstone. This is step 5 of the strategy's
  pipeline, so an authoring tool can run it before publishing.
- `computeConceptStatuses` and `studyFrontier`.

### Mastery and the frontier

For a concept with linked cards: **mastered** iff every linked card has
`repetitions >= STABLE_REPS`. A concept is **satisfied** (may unlock its dependents) if it
is mastered, or is a `map` or `assumption` (never gating), or has no linked cards. That last
case follows Courses' rule that an empty deck is vacuously mastered, so an unassessed
concept cannot become a silent dead end; the response flags it `is_unassessed` so authoring
can see it.

States: `mastered`, `available` (all `requires` parents satisfied), `locked`. The
**frontier** is the `available`, assessed concepts in topological order: what to study
next. `suggests` edges influence order only and never lock.

## Server API (`packages/server/src/domains/subjects/`)

- `POST /api/subjects`, `GET /api/subjects`, `GET /api/subjects/:id`,
  `PATCH /api/subjects/:id`, `DELETE /api/subjects/:id` (cascades concepts and edges;
  cards are untouched).
- `POST /api/subjects/import`: the whole subject (concepts, edges, card links) in one
  transaction; the graph is linted first and a defect rejects the import, leaving nothing
  behind. Fan-in (more than 4 `requires` parents) is returned as an advisory, not a defect.
- `POST /api/subjects/:id/concepts`, `PATCH .../concepts/:slug`,
  `DELETE .../concepts/:slug`. The API speaks **slugs, not concept UUIDs**; a slug is
  immutable once created.
- `PUT /api/subjects/:id/edges` and `DELETE .../edges/:from/:to`: rejected with a clear
  message if they create a cycle.
- `PUT /api/subjects/:id/concepts/:slug/cards` with `{card_ids}` (replace the linked card
  set; every card must belong to the caller).
- `GET /api/subjects/:id/progress`: concepts in route order with state, `is_unassessed` and
  card counts, the frontier, and a summary. Owner-only for now; a learner using someone
  else's public subject needs the clone step (open question below).
- `GET /api/subjects/:id/lint`: the `lintConceptGraph` report.
- Every mutation is written to the audit log with actor, target and correlation ID, and
  the AI path (MCP) is attributed to the AI actor, not "system". Two graph edits on one
  subject are serialised by a row lock, so two edges that are each acyclic cannot together
  close a cycle.
- Subjects, concepts, edges and card links are part of the account data export, and
  deleting the account cascades to all four tables.
- Status: **built and verified locally** (steps 1 and 2 below).

## MCP

`create_subject`, `get_subject`, `add_concepts`, `add_edges`, `link_cards`, `lint_subject`,
`get_subject_progress`, plus **`import_subject`**, which takes the DAG as one JSON document
(concepts, edges with reasons, card links by deck and card number) and applies it in a
single transaction. That is how the Transformers graph goes in. The `build-a-course`
prompt is extended with the strategy's pipeline (inventory, edges with reasons, lint,
review) so an AI drafting a course produces the graph first.

## Reading cards (added 2026-09-19, Chris) — built

A real course is partly just reading: orientation, the missing background the graph
exposed (the dot product, what depth buys, what an RNN is), and the map unit. So there is a
third kind of screen beside recall and multiple choice: a **`read` card**, shown, read, and
acknowledged with "Got it". It has no rating, no spaced-repetition state and no scheduling.

**Built and verified (steps below, all committed locally, none pushed):**

- **Authoring.** `@read` on its own line above a card front. The title is the front; the
  body is kept as written (paragraphs, `- ` lists, indented code), where a basic back has its
  single newlines collapsed. Option-like and sense-like lines in a body are plain text. TS and
  Kotlin parsers ship together with 8 mirrored tests each; existing decks parse identically.
  A `## ` line or a bold numbered line still starts a new category/card, so a body must avoid
  them. A lesson can't be mixed with branch cards and can't carry options or senses.
- **It is exposure, not evidence.** Mastery counts only `basic` cards, so a lesson can never
  hold a concept back. Lessons are also excluded from deck due/new/total counts, study stats and
  Courses gating (a lesson can never be "mastered"; counting it would lock every later deck).
  Deck lists carry `lesson_count` and `unread_lesson_count` separately.
- **Read state** is `card_reads` (user, card, first `read_at`; migration 024), never
  `card_progress` or `review_events`. `POST /api/study/reads` is idempotent and the first read
  wins; it is separate from `/sync` so a bad payload can't cost a learner their reviews.
- **Clients opt in** with `?lessons=1` on the study batch. Clients that predate lessons (APKs
  in the field, old web bundles) never send it, so they never receive a card they would show as
  a flip card and rate.
- **In a subject.** A concept's progress reports `lesson_count`, `unread_lesson_count` and
  `needs_reading`. A reachable concept with an unread lesson is offered on the frontier, a
  lesson-only concept (a map, say) is done once read, and the lessons of a locked concept are
  not offered early.
- **Web** and **Android** show a reading screen (title, body as written, Got it, no rating
  buttons). Web is verified end to end in a browser (Playwright, incl. an axe WCAG A/AA check);
  Android is compiled and its ViewModel/offline/API logic unit-tested, but the Compose screen was
  not rendered (no emulator was available). Strings are in en/de/es/fr; the MCP tools and the
  `build_a_course` prompt teach the syntax.

**Decisions taken while building (flag if you disagree):**

1. **Reading never gates.** An unread lesson does not lock its concept's questions or any
   dependent; it is only offered first. Making "read the lesson before the questions" a hard gate
   is a one-line change in the shared status logic, but it changes what a learner can do, so it
   is your call.
2. **Android records reads best-effort, not offline-queued.** A failed read is dropped and the
   lesson comes back next session. Queueing reads in the outbox needs a database migration and
   a WorkManager change; the server already accepts batches, so it can be added without a
   contract change.
3. **Web shows a lesson as plain text with line breaks preserved.** There is no general markdown
   engine (only images render), so `**bold**` or headings would show literally. Lists read fine.

**Not done:** Android deck-list "lessons to read" hint, Android in-app help text, reading a
lesson aloud, offline read queue (above), and rendering richer markdown in lesson bodies.

## Not in this phase

Study UI, remediation routing through prerequisites, new item types (ordering, numeric),
unit and route derivation, cloning a public subject with its card links, learner-asserted
"I already know this" for assumptions, and empirical edge validation from review data.

## Rollout, each step its own commit and green before the next

1. **Shared graph logic + tests.** No schema, no behaviour change.
2. **Migration + server domain + integration tests against real Postgres.**
3. **MCP tools + `import_subject`**, then import the Transformers DAG. _Tools built and
   tested; the Transformers graph is a committed fixture
   (`domains/subjects/fixtures/transformers-subject.json`) that a real-Postgres test imports
   and walks end to end. Importing it into production waits for the deploy._
4. **`read` card type:** parser TS + Kotlin + corpus, server acceptance and queue
   exclusion, `card_reads`, reading screen on web and Android. _Built and verified
   locally (see the section above)._
5. **Web:** subject view (graph by unit, states) and frontier-driven study.
6. **Android:** same, plus the Kotlin mirror of the graph logic.
7. **Item types:** ordering and numeric first, parser + evaluator + both UIs together.
8. **Prerequisite-aware remediation:** repeated failure on a concept re-tests its
   `requires` parents.

## Open questions

- Cloning a public subject: how are `card_concepts` remapped onto the cloner's copies of
  the cards?
- Where does an `assumption` get resolved, and does a learner assert it, take a
  diagnostic, or neither?
- Interaction with Courses: does a course become a cut of a subject, or do they coexist
  (deck-level gating for simple courses, concept-level for subjects)?
- The graph is versioned (`subjects.version`), but no history is stored yet. Is a change
  log needed before public subjects exist?
