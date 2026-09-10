# Polysemy — one headword, several meanings

**Date:** 2026-09-10 · **Status:** design agreed, not implemented · **Would become:** spec 10

A word like *der Zug* has several unrelated meanings (train / move in chess / draught of
air). Today a deck can only express that badly: one card listing all senses on the back
(all-or-nothing grading), or several cards sharing a front (you cannot tell which sense is
being asked, and each carries independent scheduling state). This design makes the **word**
the authoring unit and the **sense** the study unit.

---

## 1. The two phases

A word is learned in two phases, and the difference between them is a **fading scaffold**.

| Phase     | Prompt                     | Purpose                                 |
| --------- | -------------------------- | --------------------------------------- |
| **Chain** | `der Zug — Eisenbahn?`     | map the word's range; sense is handed to you |
| **Split** | `Der Zug fährt um 8 Uhr ab.` | retrieval practice; nothing given away  |

In chain phase all senses of a word are studied in one pass, prompted one at a time with a
short hint. Once the word graduates, its senses become ordinary independent cards prompted
by a context sentence, and drift apart in the queue.

Prompting **one sense at a time** (rather than revealing all and rating each) is what keeps
this from needing a new screen on either client — see §5.

## 2. Graduation, and the stability problem it exposed

A word graduates when **every** sense card reaches `STABLE_REPS = 3` consecutive non-lapsed
reviews.

The obvious rule — spec 06's `interval_days >= 7` — is no longer usable. Since the
fixed-cadence scheduler landed (commit `7833a91`), Hard is 1 day and Good is 2 days
*forever*; the only route past 7 days is Easy. So `interval_days` no longer measures
stability at all — it is a restatement of which button was last pressed, and a learner who
honestly presses Good would never graduate a word.

`repetitions` survived that change intact (it was deliberately not repurposed as an Easy
streak during the rewrite), so it remains an honest signal that is independent of both the
button pressed and any future scheduler.

**`STABLE_REPS` replaces `STABLE_DAYS` as the one shared stability constant.** Spec 06
inherits it; whichever feature ships first defines it in `packages/shared`.

Two deliberate consequences:

- **Graduation is reversible.** `repetitions` resets to 0 on a lapse, so failing one sense
  pulls the whole word back to chain phase and re-scaffolds it. A word you start confusing
  gets re-mapped rather than drilled blind.
- **Due counts follow the chain.** If one sense of a chain-phase word is due, all its senses
  count as due in deck stats — otherwise the badge says 1 and the session hands you 3.

## 3. Markdown contract

A word block is a card front whose back is made of **sense lines**: a `- ` line containing
at least one `|`.

```markdown
## Nouns

**1. der Zug**
- train | Der Zug fährt um 8 Uhr ab. | Eisenbahn
- move | Das war ein guter Zug! | Schach
- draught | Es zieht, mach das Fenster zu. | Luft
```

Fields split on the **first two** `|`:

| Field       | Required | Role                                    |
| ----------- | -------- | --------------------------------------- |
| **gloss**   | yes      | the answer                              |
| **context** | no       | the split-phase prompt                  |
| **hint**    | no       | the chain-phase scaffold                |

Later `|` characters stay in the context, so sentences may contain them.

Rules the parser enforces:

1. A card may not mix sense lines with diagnostic `-> correct` options → **422 naming the card**.
2. A block with exactly **one** sense line is emitted as a plain card — a one-sense word needs
   none of this machinery.
3. A back with **no** sense lines is untouched, so every existing deck parses byte-identically.

No collision with the existing branching syntax: `matchOption` only claims a `- ` line that
ends in ` -> target`, so sense lines fall through to the back handler.

## 4. What the parser emits

One block expands into **one `basic` card per sense**, contiguous in `position`, sharing the
block's category. A single card holding a `senses[]` array was rejected: `card_progress` is
keyed on `card_id`, so senses could not be scheduled independently without per-sense progress
the schema cannot express.

```
front:      "der Zug"          // headword, unchanged
back:       "train"            // this sense's gloss
context:    "Der Zug fährt…"   // null when absent
hint:       "Eisenbahn"        // null when absent
word:       "der-zug"          // slugify(front) — the grouping key
senseIndex: 0                  // 0-based
senseCount: 3
```

`word` reuses `slugify` from `packages/shared/src/slug.ts` rather than adding a tag, so there
is nothing extra to type and no slug that can drift from the headword.

**Phase is derived, never stored** — it is a read over `card_progress` rows the queue builder
already loads. No new table, no new sync surface, nothing to migrate.

## 5. Clients

The gate and the prompt both live in `packages/shared`, per the shared-logic guardrail, so
server and Android offline call the same code:

```
promptFor(card, phase) ->
  chain: hint ? `${front} — ${hint}?` : `${front} — meaning ${i+1} of ${n}`
  split: context ?? front
```

Clients render the result where `content.front` goes today. `StudyCard.content` widens from
`{front, back}` to carry the optional fields; existing cards have none of them and take the
`split` / `context ?? front` path, which is exactly today's behaviour.

- **Web:** the wider type plus the call, in `StudyControls`/`StudyPage`. No new screen.
- **Android:** the same one-line change in the study screen; its offline queue builder calls
  the shared gate.
- **Speech:** `useCardSpeech` speaks the prompt, so after graduation it speaks a full sentence
  instead of a bare noun — sentence-level listening practice, which is what spec 09 wanted.
- **MCP:** deck tool descriptions gain the sense-line syntax and one example, making "add the
  other senses of *Zug*, with context sentences and hints" a normal request. Hand-authoring
  three fields per sense is real work; AI authoring is the intended path (§2.5 of the ideas doc).

## 6. Testing

- **Shared corpus** (`fixtures/parser-cases.json`, TS + Kotlin parity): field splitting,
  optional fields absent, extra `|` in context, one-sense block collapsing to a plain card,
  no-sense-lines back byte-identical to today.
- **Shared units:** phase gate at the boundary (`repetitions` 2 vs 3); `promptFor` in both
  phases including both fallbacks.
- **Server:** queue pulls all senses when one is due in chain phase and does not in split;
  due counts follow the chain; sense lines + `-> correct` → 422 naming the card.
- **Android:** offline queue gates identically (shared-function parity test).
- **Web:** chain renders the hint prompt, split renders the context.

Python stays frozen (guardrail 00) — it has no branching and gets no sense lines.

## 7. Knock-on: two specs now describe behaviour that does not exist

**Spec 06 (depth ladders)** gates on `interval_days >= 7`. Unreachable for an honest
Good-presser under the current scheduler, so depth tiers would never unlock. Its gating rule
and acceptance criterion 3 need rewriting to `STABLE_REPS`.

**Spec 04 (FSRS)** is in direct conflict with shipped code, not merely stale. Its premise is
replacing SM-2 with an algorithm that models stability to *compute* intervals — adopting it
would undo the fixed cadences chosen on 2026-09-10. Someone picking it up cold would build
the wrong thing. **Needs amending or retiring; not touched here pending review.**

## 8. Open questions

1. **Does the chain phase need a cap?** A word with eight senses hands you eight prompts in
   one session. Cap the chain, or accept it?
2. **Reverse direction.** This designs word → meaning. Meaning → word is where polysemy really
   bites (several prompts, one answer) and is not addressed.
3. **Cross-deck words.** Same-deck only, as with spec 06's concepts. Probably right for v1.
