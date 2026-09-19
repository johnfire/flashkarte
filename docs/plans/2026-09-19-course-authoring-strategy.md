# From subject to course — authoring strategy

_Date: 2026-09-19 · Status: **draft for discussion, nothing built** · Scope: method first,
then what it implies for the app (web + Android, never one without the other)_

## 1. The goal, and the real problem

Goal: someone who knows nothing about a subject can work through flashkarte and end up
with a solid understanding of it, with the app deciding at each step whether they are
ready to move on.

The current stack is a good **memory** system: SM-2-style scheduling, parity-tested
parser, diagnostic multiple choice, gated deck paths (Courses). A course needs three
things it does not yet have:

1. **A knowledge structure** — what depends on what. Today order is whatever the author
   typed.
2. **Assessment beyond "state the fact"** — sequencing, calculating, discriminating,
   predicting. Flip cards test recall only.
3. **Evidence-based progression** — "ready to move on" decided by evaluated answers,
   with failure routed to _the right thing to study_, not just "again".

## 2. What the two reference decks show

Read from the live deck data on 2026-09-19 (`get_deck`). Observations, not opinions.

**Electronics Ch. 1** (104 cards)

- 92 plain flip cards, 6 multiple choice, 6 remediation cards. Almost all of it is
  "state the formula / say what X is". There is not one worked numerical problem, in a
  subject that is mostly calculation.
- Category order is the textbook's, not a learning order. Card 13 (why a divider sags
  under load) sits before Thévenin (14–16), which is what explains it. Card 85 needs
  "stiff reference" and diode clamps.
- The MC cards were appended later, so categories "Impedance, Reactance & Filters" and
  "Capacitors & RC Circuits" each appear **twice** (cards 57–73 and 93–100; 21–33 and
  101–104). Structure was lost by appending.
- Duplication: 37 and 52 both ask about the diode across a relay coil.
- The best cards are 88–91 ("which chapter-1 facts does this circuit rely on?"). They
  are synthesis and transfer items, and the deck has only four.

**Transformers** (86 cards)

- 17 vocabulary/notation cards come first. Defensible for notation, but it means a
  learner meets terms long before they are used.
- 8 multiple choice cards, each with a remediation label.
- The pipeline walk-through (card 18) is really a _capstone_ that asks the learner to
  sequence nine things covered elsewhere, yet it sits in the opening section.

**Common failure:** both decks are correct, dense reference material in _reading_ order.
Neither says what must be understood first, and neither can tell "knows it" from "has
seen it."

## 3. The model

Five layers. Each is separate data, so any one can be revised without breaking the rest.

| Layer       | What it is                                                      | Where it lives today                      |
| ----------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Concept** | One atomic thing to know or be able to do                       | nowhere (Spec 06 has `@concept`, unbuilt) |
| **Edge**    | `requires` (gates) or `suggests` (orders only) between concepts | nowhere                                   |
| **Item**    | One question testing one concept at one depth, of one _type_    | cards (`basic`, diagnostic MC)            |
| **Unit**    | A chunk of concepts studied together, ending in a capstone      | decks                                     |
| **Path**    | Ordered, gated sequence of units                                | Courses (deck-level gating)               |

Two rules that come from the transformers discussion:

- **A data-flow order is not a learning order.** "Tokenizer → embedding → block → head"
  is how the machine runs. Edges must mean "you cannot make sense of B without A."
- **Two edge strengths.** `requires` may gate; `suggests` only orders. Gate on all edges
  and you trap people on edges the author merely felt were natural.

## 4. Pipeline: subject to course

Each step has an output that can be checked before the next begins.

1. **Scope.** Learner's starting point, target ("can do / can explain X"), and a hard cap
   on size. _Output:_ 3–7 outcome statements, each a testable verb ("calculate", "predict",
   "distinguish"), not "understand".
2. **Ground it.** Real sources read in full; no writing from memory. _Output:_ a source
   list, so every concept traces to something checkable.
3. **Concept inventory.** Extract atomic concepts. Test: can it be assessed with one
   question? If it needs "and", split it. Separate _terms_ (glossary) from _ideas_
   (relationships, mechanisms) from _skills_ (procedures). _Output:_ flat list with ids.
4. **Draw the edges.** For each concept ask: _"Could a bright newcomer follow the
   explanation of B without A?"_ No → `requires`. Helpful but not necessary → `suggests`.
   Only accept an edge you can justify in one sentence; record the sentence. _Output:_
   the DAG plus a reason per edge.
5. **Lint the graph (automatic).** Acyclic; every non-root reachable from a root; no
   concept with more than ~4 `requires` parents (a sign it is really two concepts); the
   longest chain gives the minimum course depth.
6. **Derive the order.** Topological sort. Ties are broken by a per-course choice
   (§8, decision 1): _shape-first_ or _bottom-up_. Group into units of roughly 12–25
   concepts, so a unit is one sitting-week, not a textbook chapter.
7. **Write items per concept, at more than one depth**, using the type table (§5).
   Every concept needs ≥1 recognition item and ≥1 _production or application_ item.
   Distractors and remediation are written from the real misconceptions found in step 2,
   not invented filler.
8. **Add a capstone per unit.** Sequencing or multi-concept problems that need the
   unit's concepts together. This is where card 18 and cards 88–91 belong.
9. **Lint the items (automatic).** Every item names its concept; **no item uses a term
   whose concept is not an ancestor of the item's own concept** (this would have caught
   card 13); near-duplicate detection (37/52); each concept has ≥2 item types.
10. **Human review.** The domain reader checks the edge reasons and the capstones only.
    They cannot review 900 items, so tooling narrows what they must read.
11. **Revise from data.** See §6, "validating the graph."

Steps 3–4 are where an LLM is helpful and where it is most likely to be quietly wrong. A
graph the same model drafted and the same person skim-reviews is circular for any subject
the reviewer is still learning. Hence step 4's written reason per edge, and §6.

## 5. Item types

Principle: **every type ships with a built-in evaluator** — a pure function
`(answer, key) → {correct | partial | wrong, misconception?}`. Only types with a
deterministic evaluator may _gate_ progress. Anything self-rated is practice, not proof.

| Type                            | Tests                                     | Evaluator                               | Wrong answer →                                                          |
| ------------------------------- | ----------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Flip / recall _(exists)_        | recall                                    | self-rated                              | reschedule                                                              |
| Multiple choice _(exists)_      | discrimination                            | exact option                            | remediation label per distractor                                        |
| Multi-select                    | discrimination, several right             | exact set (partial credit optional)     | label per missed/wrong option                                           |
| **Ordering / sequence**         | process, mechanism                        | exact order; pairwise score for partial | send to the card for each misplaced step                                |
| **Numeric / compute**           | applying a formula or procedure           | number within tolerance, unit check     | label per _known wrong result_ (e.g. forgot to invert the parallel sum) |
| Match / classify (into buckets) | categorisation, distinguishing            | exact mapping                           | label per confused pair                                                 |
| Cloze (fill the blank)          | precise recall in context                 | normalised string, or numeric           | reschedule                                                              |
| Predict the change              | qualitative causal reasoning ("↑/↓/same") | exact                                   | label per direction error                                               |
| Label the diagram               | linking names to structure                | click region / drop target              | reschedule                                                              |
| Explain in words                | understanding                             | none (self-rated against a rubric)      | practice only; never gates                                              |

Two ideas worth noting because they are cheap and strong:

- **Numeric items with trap answers.** The author lists the numbers a common mistake
  produces and routes each to a remediation card. That extends the existing
  `-> correct` / `-> label` mechanism, so diagnosis works for calculation too.
- **Failure that uses the graph.** If a learner keeps failing concept B, the useful
  action is to test its `requires` parents and send them back to whichever is weak. That
  is what the DAG is _for_ at study time. Without it, "wrong" only ever means "repeat
  the same card."

## 6. Progress and mastery

Kept consistent with what is already shipped:

- **Concept mastery** = `repetitions >= STABLE_REPS` on its items, **and** at least two
  item types passed. Not the interval: since 2026-09-10 the scheduler is fixed-cadence,
  so `interval_days` restates the last rating and measures nothing.
- **Unit mastery** = all its concepts mastered; that is what unlocks the next unit,
  reusing Courses gating.
- **Unlock granularity.** Courses gate per deck today. A concept-level DAG needs
  cross-deck concepts (Electronics Ch. 2 needs Ch. 1 ideas); Spec 06 limits `@concept`
  to one deck. That limit has to be lifted.

**Validating the graph** with real data, later: for concept pairs A→B, compare B's
failure rate for learners whose A was stable vs. not. A large gap supports the edge; none
suggests it is `suggests`, not `requires`. This needs many learners, so it applies to
public courses, not a private deck. Until then, edges are _claims with a written reason_,
not facts.

## 7. Cross-platform cost (a constraint, not an afterthought)

Every new item type must work on web **and** Android. In this repo that means, per type:

1. Markdown syntax in the TS parser **and** Kotlin `MdParser.kt`, with corpus cases
   (the frozen Python port is exempt).
2. The evaluator as a pure function in `packages/shared`, mirrored in Kotlin, with
   parity tests.
3. A study UI in web and in Compose. Drag-and-drop on touch needs its own design
   (long-press drag, or tap-to-place as the accessible fallback).
4. Server validation, an MCP authoring description, help-page text.

So each type is a real piece of work. Cost per type is why the list should be _short at
first_, chosen by value: **numeric/compute** and **ordering** first (both deterministic,
both used by the two reference subjects), then multi-select, match/classify, cloze. Label
the diagram and predict-the-change come after, and explain-in-words stays practice-only.

## 8. Decisions needed before any building

1. **Learning-order philosophy per course:** _shape-first_ (overview, then open each
   box) or _bottom-up_. My recommendation for engineers: shape-first, using an ungated
   "map" unit at the start (the pipeline in Transformers, the four building blocks in
   Electronics) that is read-and-orient, and re-tested as the capstone at the end.
2. **Where the graph lives:** in the card markdown (`@concept`, `@requires`), or as its
   own structure managed via API/MCP like Courses. Markdown keeps a deck a single file;
   an API structure avoids the round-trip and lets edges carry reasons. I lean API/MCP,
   with markdown export for backup.
3. **Concept scope:** cross-deck concepts (needed for the multi-chapter case) or keep
   Spec 06's one-deck limit and gate only between decks.
4. **First item types** to build (§7 suggests numeric/compute, then ordering).
5. **Rebuild vs extend.** Everything here maps onto existing pieces (Courses, Spec 06,
   the diagnostic mechanism). I recommend extending, and would want to hear what a
   rebuild buys that this does not.

## 9. Suggested next steps (in order)

1. Agree decisions 1–3 above.
2. Apply steps 3–5 to **Electronics Ch. 1** as a paper exercise: inventory, edges with
   reasons, lint. Output is a graph document, no code. Ch. 1 first because it has a
   clear prerequisite chain (Ohm → series/parallel → divider → loading → Thévenin;
   capacitor → RC → filters → resonance) that you can judge yourself.
3. Repeat for Transformers to see whether the method holds up in a different subject.
4. Only then design the data model and the first two item types.
