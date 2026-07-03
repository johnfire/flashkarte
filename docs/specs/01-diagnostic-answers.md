# 01 — Diagnostic answers (routed wrong options on SR cards)

**Priority:** 1 — completes the original branching idea · **Effort:** ~1 week
**Scope:** shared parser + server + Android study; web in Spec 08

## Goal

On an ordinary SR card, each wrong multiple-choice option may route to a remediation card
that untangles that specific confusion. A wrong answer becomes diagnostic information.

## Current state (verified 2026-07-02)

- Branch cards (`[label]` + `- text -> target`) and SR cards are mutually exclusive per
  deck (`packages/server/src/domains/decks/branching.ts` validates; design spec forbids
  mixing). Branch decks have no SR state.
- Android MC mode (`ui/screens/study/`, `McOptions.kt`) builds distractors randomly from
  other cards' backs; correct → rating 4, wrong → rating 1.
- `review_events`: `event_id, user_id, card_id, rating, reviewed_at` — no record of
  *which* option was chosen.

## Markdown contract (parser change — TS + Kotlin + corpus, per guardrails)

```markdown
[meiosis-vs-mitosis]
**14. A cell divides producing four genetically distinct haploid cells. This is:**
- Meiosis -> correct
- Mitosis -> confusion-mitosis
- Binary fission -> end
The answer text (back) follows as usual.

[confusion-mitosis]
**15. You mixed these up. Mitosis produces:**
Two genetically IDENTICAL diploid cells. Meiosis = gametes, variety, halved chromosomes.
```

- New reserved target **`correct`**: marks the right option. A card with options where
  **exactly one** targets `correct` is a **diagnostic card**: `type` stays `basic`
  (it has front/back and SR state), `content.options` is stored alongside.
- Wrong options route to a label (remediation card) or `end` (no remediation; plain wrong).
- A card with options and NO `-> correct` option remains a `branch` card (unchanged).
- Backward compatibility: all existing decks parse identically (corpus proves it).

## Server

1. Extend `branching.ts` validation: diagnostic cards allowed in SR decks; their non-`correct`
   targets must resolve to labels in the same deck or `end`; exactly one `correct` option;
   remediation targets must be `basic` cards (no chaining validation beyond one hop needed —
   remediation cards are ordinary cards). Branch cards remain forbidden in SR decks.
2. Migration `0NN`: `ALTER TABLE review_events ADD COLUMN option_index INT NULL;`
   `/api/study/review` and `/api/study/sync` accept optional `optionIndex` per event
   (old clients omit it — must keep working; add a contract test for the old shape).

## Shared logic (`packages/shared`, new `study/` module — used by Android now, web in Spec 08)

- `selectOptions(card, sessionPool)`: authored options (shuffled) when present, else the
  existing random-distractor behavior.
- `resolveChoice(card, optionIndex)` → `{ correct: boolean, rating: 4|1, remediationLabel?: string }`.
- Kotlin mirror + parity test cases.

## Android study flow

- MC mode: render authored options when present. On wrong pick with a remediation label:
  rate 1 (event carries `optionIndex`), then show the remediation card **as an interlude**
  — front+back revealed together, one "Continue" button, **no rating, no review event**
  (it stays an ordinary card in the deck and is scheduled normally by SM-2 when its turn
  comes; do not double-schedule it).
- Flip mode: unchanged (diagnostic cards flip like normal cards).
- Offline: interlude resolution must work from the local SQLDelight store (cards are
  already cached whole-deck).

## Acceptance criteria

1. Corpus: existing fixtures unchanged; new fixtures for diagnostic card, branch card,
   and a deck mixing SR + diagnostic cards — parsed identically by TS and Kotlin.
2. Deck upload with a diagnostic card whose remediation target doesn't exist → 422 naming
   the target; with two `-> correct` options → 422.
3. Android MC study of a diagnostic card: wrong routed pick → Again event with
   `option_index` recorded → remediation interlude shown → next queue card. Correct pick
   → Good, no interlude.
4. A card's remediation interlude generates NO review_event (assert on ledger).
5. Old sync payload (no optionIndex) still accepted (contract test).
6. Pure branch decks and pure SR decks behave exactly as before (regression).

## Tests

Shared: parser + `resolveChoice` (both ports). Server: validation matrix, migration,
sync contract old/new. Android: ViewModel tests for interlude flow + outbox event shape.
