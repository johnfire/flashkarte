# flashkarte — From Flashcard App to Learning Engine

**Date:** 2026-07-02 · **Reviewed:** full repo at `~/ppp2/flashkarte` (shared parser + SM-2, server, web, Android, MCP, branching design spec)

---

## 1. Where It Stands

The foundation is better than "least developed" suggests: a parity-tested markdown parser in three languages, a clean SM-2 implementation shared across clients, an idempotent `review_events` ledger that makes offline sync deterministic, and a branching system (`[label]` anchors, `- option -> target`) that parses, validates, and plays on Android.

But the branching system — the "different answers lead in different directions" idea — stopped exactly at the interesting moment. As built, it's walled off:

- A deck is _either_ a branch deck _or_ an SR deck. Never both (the design spec explicitly rejects mixing).
- Branch decks have **no learning state at all**: no review events, no progress, no completion tracking, no spaced repetition. They're a choose-your-own-adventure player.
- Branch play is Android-only; web can't even play it.

So today flashkarte contains a _memory system_ (SM-2 queue) and a _navigation system_ (branch trees) that don't talk to each other. The entire opportunity is in connecting them — because the deep insight behind "different answers lead in different directions" is not adventure games. It's this:

> **A wrong answer is information.** _Which_ wrong answer you gave tells the system _what_ you actually confused — and therefore what to show you next.

That single idea, taken seriously, turns a flashcard app into a learning engine. Everything below is a variation on it.

---

## 2. The Core Ideas

### 2.1 Diagnostic answers — complete the branching idea (the flagship)

Today, multiple-choice mode (Android) generates distractors randomly from other cards' backs, and a wrong pick just means rating 1. Wasted signal.

Instead, let an author (or an AI) attach a route to each wrong option — **on ordinary SR cards**, using the syntax that already exists:

```markdown
[meiosis-vs-mitosis]
**14. A cell divides producing four genetically distinct haploid cells. This is:**

- Meiosis -> correct
- Mitosis -> confusion-mitosis
- Binary fission -> confusion-fission

[confusion-mitosis]
**15. You mixed these up. Mitosis produces:**
Two genetically IDENTICAL diploid cells. Key discriminator: meiosis = gametes,
variety, halved chromosomes. Mitosis = growth/repair, clones.
```

Semantics: pick the right answer → normal SM-2 "Good". Pick a _routed_ wrong answer → rate "Again" AND immediately show the remediation card (an interlude, not a scheduled review), which untangles that specific confusion. The remediation card can itself carry SR state, so a confusion you hit repeatedly starts appearing in your queue as a first-class thing to learn.

This is exactly how good medical exam banks work: distractors are chosen _because_ they're the classic confusions, and the explanation addresses each one. Your friend's medicine use case is the strongest argument for building this first.

What it requires: relax the branch/SR wall (a card may have both SR state and options with gotos), extend MC study to use authored options when present (fall back to random distractors otherwise), and record which option was picked in `review_events` (add an optional `option_index` — the ledger pattern already exists). The parser needs a reserved `-> correct` target and nothing else new.

### 2.2 Beyond four buttons — confidence, and a modern scheduler

Two independent upgrades to "more than yes I know it / no I don't":

**a) Confidence before reveal.** Ask "sure / think so / guessing" _before_ showing the answer, then combine with correctness. The dangerous state isn't "wrong" — it's **confidently wrong**, and it deserves the shortest interval and a remediation route (2.1 again). "Guessed right" is nearly as bad and currently indistinguishable from mastery. This trains metacognition — knowing what you know — which for self-directed learners (you, learning AI) is half the battle. Cheap to build: one extra tap, one column on `review_events`.

**b) Replace SM-2 with FSRS.** SM-2 is from 1987. FSRS (Free Spaced Repetition Scheduler) is the modern, open-source, ML-fitted algorithm Anki adopted — it models each card's memory _stability_ and _difficulty_ explicitly and produces measurably better intervals from the same 4-grade input. Two things make flashkarte unusually well-positioned: the algorithm is cleanly isolated in `packages/shared/src/sm2/` behind one `calculate()` function, and your `review_events` ledger is **exactly** the full review history FSRS needs to optimize its parameters per user. Most apps throw that data away; you've been keeping it since migration 008. Port carefully (TS + Kotlin together — parity is a house rule), keep SM-2 as fallback.

### 2.3 Depth ladders — "going far deeper into a topic"

Recall isn't understanding. Structure cards in explicit **depth tiers** on the same concept, roughly Bloom's ladder:

| Tier        | Question style       | Example (learning AI)                                         |
| ----------- | -------------------- | ------------------------------------------------------------- |
| 1 Recognize | MC / definition      | "What does backpropagation compute?"                          |
| 2 Recall    | classic front/back   | "State the chain rule as used in backprop"                    |
| 3 Apply     | worked micro-problem | "Given this 2-layer net and loss, which weight changes most?" |
| 4 Explain   | free-form prompt     | "Why do vanishing gradients happen, and name two mitigations" |

Markdown: a `@depth 2` tag line per card (parser addition), plus a rule: **tier N+1 cards stay locked until the tier-N card on the same concept is stable** (e.g. interval ≥ 7 days). Concepts link via the existing label mechanism. The study queue then naturally drags you deeper as shallow knowledge solidifies — the deck _grows down_ as you learn. This, plus 2.1, is "the whole idea of spaced repetition, deeper."

Tier-4 "explain" cards can't be self-graded honestly by flip-and-rate alone — which is where 2.5 comes in.

### 2.4 Clinical cases / scenario scoring — make branch play a learning mode

For the medicine use case, the branch engine is already 80% of a clinical case simulator: vignette → choose workup → result → choose diagnosis → treatment. Missing: consequences and memory.

- **Path scoring:** allow options to carry a quality marker — `- Order CT -> next [best]`, `- Discharge -> ending-bad [harm]`. Completing a case yields a score (optimal / acceptable / harmful choices).
- **Persistence:** record traversals as events (new `path_events` table, same idempotent-ledger pattern as `review_events`). Completion stats, and cases where you chose badly get _rescheduled_ — spaced repetition of scenarios, not just facts.
- **Case → facts feedback:** a harmful choice can route (2.1 again) to the SR cards for the underlying knowledge gap.

Note the pattern: 2.1, 2.3 and 2.4 are all the same primitive — **routed options + learning state** — at three scales (card, concept, scenario). Build the primitive once.

### 2.5 The AI loop — where the MCP server becomes the teacher

The MCP server currently has 5 tools, all deck CRUD. The AI can author but is blind to learning state. Add read access to progress and the loop closes:

- `get_study_summary` / `get_struggling_cards` — cards with low stability, repeated "Again", confidently-wrong events.
- `get_confusion_pairs` — mined from 2.1's option-choice data: "user picks X when answer is Y, 4 times."
- `generate` workflows on top: the AI writes **targeted remediation cards** for actual confusions, **plausible distractors** (current random-back distractors are weak; for medicine they must be the classic confusions — a perfect LLM task), **depth-ladder expansions** ("go deeper on attention mechanisms" → tier 2–4 cards appended), and **case vignettes** from a topic list.
- Tier-4 "explain" grading: user types/speaks an explanation, AI grades it against the card's rubric and submits the rating via a new `submit_review` tool.

This converges with your notes-world vision doc: the database is the memory, the AI is the interface. flashkarte's ledger + MCP make it the same architecture pointed at learning. You studying AI _with_ an AI that reads your review history and writes tomorrow's cards is the product demo.

### 2.6 Media cards

Cards are plaintext-only. For medicine this is disqualifying (ECGs, histology slides, radiographs); for AI it hurts (architecture diagrams). Markdown already has image syntax — `![alt](url)` — the parser just needs to pass it through and clients render it. Storage: start with external URLs (zero infrastructure), add uploads later. Unglamorous, high value.

---

## 3. What I'd Deliberately NOT Do

- **Narrative-game machinery** — inventory, flags, weighted-random routing, `${context.var}` interpolation. That's a text-adventure engine. Every branching feature should answer "what does this diagnose or remediate?" — if nothing, cut it.
- **A visual branch editor** — markdown-as-source is the product's soul (and what makes AI authoring trivial). Improve _validation errors_ instead (line numbers, "label `meadow` unreachable").
- **Custom user-defined scheduling algorithms** — same argument as notes-world settings: pick FSRS, tune defaults, move on.
- **A fourth parser port.** Python is reference-only and already lacks branching; freeze it, note it, don't chase parity there.

## 4. A Warning From the Other Two Projects

The dual-surface drift you have in art-platform (SSG vs Next.js) is already germinating here: **multiple-choice and branch play are Android-only; web is flip-only.** Every idea above must declare its client story up front or web becomes the second-class citizen that eventually forks the product. Recommendation: implement new _logic_ in `packages/shared` (both schedulers, routing semantics, scoring) so clients are thin renderers of shared behavior — the parser/SM-2 parity discipline you already practice, extended to everything new.

## 5. Suggested Sequence

| Order | Item                             | Core change                                                                                   | Effort  |
| ----- | -------------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| 1     | Diagnostic answers (2.1)         | parser `-> correct`, relax branch/SR wall, MC uses authored options, `option_index` on events | ~1 wk   |
| 2     | Confidence rating (2.2a)         | one tap pre-reveal, ledger column, scheduler tweak for confidently-wrong                      | ~2–3 d  |
| 3     | Media pass-through (2.6)         | parser + render `![...]`, URL-only                                                            | ~2–3 d  |
| 4     | FSRS (2.2b)                      | shared scheduler swap TS+Kotlin, SM-2 fallback, optimizer job reads ledger                    | ~1–2 wk |
| 5     | MCP study tools (2.5)            | read tools first: summary, struggling, confusion pairs, submit_review                         | ~1 wk   |
| 6     | Depth ladders (2.3)              | `@depth` tag, stability-gated unlock in queue builder                                         | ~1 wk   |
| 7     | Case scoring + persistence (2.4) | `[best]/[harm]` markers, `path_events`, reschedule-failed-cases                               | ~1–2 wk |
| 8     | Web parity for MC + branch play  | render shared logic on web                                                                    | ~1 wk   |

Items 1–3 are independent and could run as parallel agent tasks. Item 1 is the one that completes your original unfinished idea — I'd start there.

## 6. Open Questions

1. **Authoring burden vs. AI authoring:** diagnostic options and depth ladders are more work per card. Acceptable for you (AI writes them via MCP), but is your friend hand-writing medicine decks or AI-generating them? The answer decides how much authoring UX matters.
2. **Retention target:** FSRS lets you choose desired retention (e.g. 90%). Exam-driven (medicine, date-bound) vs. lifelong-learning (you) want different settings — this may be the first _legitimate_ per-user preference in the app.
3. **Free-form answer grading (tier 4):** in-app AI calls, or keep all AI on the user's own account via MCP (current philosophy)? Staying MCP-only is cheaper and more private, but makes tier-4 grading a desktop-Claude workflow rather than an in-app button.

---

_All feature present/absent claims verified against the repository: parser + branching in `packages/shared/src/markdown/parser.ts` and `server/src/domains/decks/branching.ts`, SM-2 in `packages/shared/src/sm2/`, ledger in migration `008_review_events.sql`, play engine in `android/.../ui/screens/play/`, MCP tools in `packages/mcp/src/tools/decks.ts`, branching design spec in `docs/superpowers/specs/2026-06-06-branching-decks-design.md`._
