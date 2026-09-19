# Subject model — Design

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
  (`core | extension`). Progress is keyed to the concept id, so reshuffling decks or
  editing the graph never loses anyone's progress.
- `concept_edges`: `from_concept` (the prerequisite), `to_concept` (the dependent),
  `strength` (`requires | suggests`), `reason` (required for `requires`). May cross
  subjects, so a course's entry floor can point at another subject's concepts. An edge is
  a claim by the dependent concept's author: only the owner of `to_concept`'s subject may
  add or remove it, and the prerequisite must be readable by them (their own, or public).
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
stay thin renderers. Kotlin gets a mirror when Android consumes it (phase 5).

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
- `POST /api/subjects/:id/concepts`, `PATCH .../concepts/:conceptId`,
  `DELETE .../concepts/:conceptId`.
- `PUT /api/subjects/:id/edges` and `DELETE .../edges/:from/:to`: rejected with a clear
  message if they create a cycle.
- `PUT /api/concepts/:conceptId/cards` (replace the linked card set; every card must
  belong to the caller).
- `GET /api/subjects/:id/progress`: every concept with state, `is_unassessed`, and the
  frontier.
- `GET /api/subjects/:id/lint`: the `lintConceptGraph` report.
- Every mutation is written to the audit log with actor, target and correlation ID, and
  the AI path (MCP) is attributed to the AI actor, not "system".

## MCP

`create_subject`, `get_subject`, `add_concepts`, `add_edges`, `link_cards`, `lint_subject`,
`get_subject_progress`, plus **`import_subject`**, which takes the DAG as one JSON document
(concepts, edges with reasons, card links by deck and card number) and applies it in a
single transaction. That is how the Transformers graph goes in. The `build-a-course`
prompt is extended with the strategy's pipeline (inventory, edges with reasons, lint,
review) so an AI drafting a course produces the graph first.

## Not in this phase

Study UI, remediation routing through prerequisites, new item types (ordering, numeric),
unit and route derivation, cloning a public subject with its card links, learner-asserted
"I already know this" for assumptions, and empirical edge validation from review data.

## Rollout, each step its own commit and green before the next

1. **Shared graph logic + tests.** No schema, no behaviour change.
2. **Migration + server domain + integration tests against real Postgres.**
3. **MCP tools + `import_subject`**, then import the Transformers DAG.
4. **Web:** subject view (graph by unit, states) and frontier-driven study.
5. **Android:** same, plus the Kotlin mirror of the graph logic.
6. **Item types:** ordering and numeric first, parser + evaluator + both UIs together.
7. **Prerequisite-aware remediation:** repeated failure on a concept re-tests its
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
