# 10 — Polysemy (one headword, several senses)

**Priority:** 10 · **Effort:** ~1 week · **Scope:** shared parser + shared gate/prompt +
server queue + web + Android study
**Design:** `docs/plans/2026-09-10-polysemy-design.md` (read for rationale)

## Goal

A word with several unrelated meanings (*der Zug* = train / chess move / draught) is authored
as **one block** and studied as **one card per sense**. Senses are learned in two phases: a
**chain** phase that hands you the sense via a short hint, then **split** independent cards
prompted by a context sentence. The scaffold fades as the word is learned.

## Current state (verified 2026-09-10)

- No polysemy support. Two bad workarounds exist: all senses on one back (all-or-nothing
  grading, and `cleanBack` joins lines with a space unless blank-separated), or several cards
  sharing a front (ambiguous prompt; nothing rejects it — no unique constraint on content,
  no duplicate check in `decks.service.ts`).
- `cards.content` is `jsonb` (migration `001_init.sql`) — **no migration is needed** for the
  new fields.
- `card_progress` is keyed on `card_id`; `repetitions` counts consecutive non-lapsed reviews
  (preserved deliberately through the `7833a91` scheduler rewrite).
- `matchOption` claims a `- ` line only when it ends in ` -> target`, so sense lines do not
  collide with branching syntax.

## Markdown contract (parser change — TS + Kotlin + corpus, per guardrails)

A **sense line** is a `- ` line containing at least one `|`. A card whose back has two or more
sense lines is a **word block**.

```markdown
**1. der Zug**
- train | Der Zug fährt um 8 Uhr ab. | Eisenbahn
- move | Das war ein guter Zug! | Schach
- draught | Es zieht, mach das Fenster zu. | Luft
```

A line is split into **at most three** fields, so any further `|` belongs to the hint. The
`|` is also what *marks* the line as a sense line: a bare `- train` is an ordinary bullet, or
every deck with a bulleted back would silently become a word block. A sense with neither
context nor hint is therefore written with a trailing pipe — `- train |`.

| Field       | Required | Role                      |
| ----------- | -------- | ------------------------- |
| **gloss**   | yes      | the answer (card back)    |
| **context** | no       | the split-phase prompt    |
| **hint**    | no       | the chain-phase scaffold  |

Rules:

1. Sense lines mixed with diagnostic `-> correct` options → **422 naming the card**.
2. Exactly **one** sense line → emitted as a plain card (no polysemy machinery).
3. A back with **no** sense lines is untouched — existing decks parse byte-identically.
4. Empty gloss (`- | context`) → the line is not a sense line (mirrors `matchOption`).
5. **Every non-blank line** of the back must be a sense line, or the back is left alone. This
   strictness is what protects existing decks; the residual risk is a deck whose back happens
   to consist entirely of `- a | b` lines (a hand-written table), which would now be read as
   senses. Nothing in the repo's corpus or fixtures matches that shape, but decks already on
   the server were not inspected.
6. Sense lines and options never collide: `matchOption` is tried first and claims only lines
   ending in ` -> target`.

## What the parser emits

One block → **one `basic` card per sense**, contiguous in `position`, sharing the block's
category. `ParsedCard` gains four optional fields; `content` stores:

```
front "der Zug" · back "train" · context "Der Zug fährt…"|null
hint "Eisenbahn"|null · word "der-zug" · senseIndex 0 · senseCount 3
```

`word` is `slugify(front)` from `packages/shared/src/slug.ts` — no new tag to type, no slug
that can drift from the headword. Stored nested as `content.sense` rather than five flat keys.
`label` goes on the first sense only, so a branching target resolves to one card.

A card carrying **both** sense lines and options sets `senseConflict: true` and is emitted
unchanged (options win, back stays prose) — nothing is silently dropped, and the server has a
single boolean to reject on rather than re-deriving the detection from a joined back.

**Rejected:** one card holding a `senses[]` array. `card_progress` is keyed on `card_id`, so
senses could not be scheduled independently without per-sense progress the schema cannot express.

## Shared logic (`packages/shared`, per the shared-logic guardrail)

New `study/senses.ts`:

- `STABLE_REPS = 3` — **replaces `STABLE_DAYS`**; spec 06 must adopt it (see Knock-on).
- `wordPhase(senseProgress[]) -> "chain" | "split"` — `split` iff **every** sense has
  `repetitions >= STABLE_REPS`.
- `promptFor(card, phase) -> string`
  - chain: `hint ? "${front} — ${hint}?" : "${front} — meaning ${senseIndex+1} of ${senseCount}"`
  - split: `context ?? front`

Kotlin mirror + parity test cases. Clients are thin renderers — no phase logic in a ViewModel
or React page.

## Why not `interval_days >= 7`

Since `7833a91` Hard is 1 day and Good is 2 days **forever**; only Easy exceeds 7. So
`interval_days` no longer measures stability — it restates the last button pressed, and an
honest Good-presser would never graduate a word. `repetitions` is independent of both the
button and the scheduler.

## Server (`study.repository.getDueAndNewCards`)

1. When a word is in **chain** phase and **any** of its senses is due/new, all its senses enter
   the session, ordered by `senseIndex`. Senses not otherwise due are reviewed early —
   intended.
2. In **split** phase senses are ordinary independent cards; no bunching.
3. Deck stats: senses pulled by the chain count toward `due`, or the badge disagrees with the
   session.
4. Upload validation: rule 1 above → 422.

Phase is **derived per request** from `card_progress` rows the queue already loads. No new
table, no new column, no sync change — old Android clients are unaffected.

## Clients

`StudyCard.content` widens to carry the optional fields. Cards without them take the
`split`/`context ?? front` path — exactly today's behaviour.

- **Web:** wider type + `promptFor` call in `StudyPage`/`StudyControls`. No new screen.
- **Android:** same one-line change in the study screen; offline queue builder calls the
  shared gate against its local store.
- **Speech:** `useCardSpeech` speaks the prompt, so after graduation it speaks a full sentence
  — sentence-level listening practice (spec 09's intent).
- **MCP:** deck tool descriptions gain the sense-line syntax + one example; "add the other
  senses of *Zug* with context sentences and hints" becomes a normal request.

## Acceptance criteria

1. Parity in the **TS and Kotlin suites** (not `fixtures/parser-cases.json` — that corpus is
   TS+Python and Python is frozen, same reason branching lives outside it): a 3-sense block,
   a block with gloss only, a one-sense block collapsing to a plain card, and a context
   containing `|`. The shared corpus must still pass **unchanged**, proving Python is unaffected.
2. Upload of a card mixing sense lines with `-> correct` → 422 naming the card.
3. Chain phase: a word with senses at `repetitions` 0/1/2 where one sense is due → all three
   senses in the batch, ordered by `senseIndex` (repository-level test).
4. Split phase: same word with all senses at `repetitions >= 3` → only the due sense.
5. A lapse on one sense (`repetitions` → 0) returns the word to chain phase.
6. `promptFor` parity TS/Kotlin across both phases and both fallbacks.
7. Decks with no sense lines behave exactly as before (regression).

## Tests

Shared: parser (TS + Kotlin suites), `wordPhase` at the boundary (`repetitions` 2 vs 3),
`promptFor`. The TS+Python corpus is a regression guard here, not the parity vehicle. Server: queue matrix chain/split, due counts, 422 validation. Android: offline
queue parity. Web: chain renders hint prompt, split renders context.

## Knock-on (do not skip)

- **Spec 06** gates depth tiers on `interval_days >= 7` — unreachable under the current
  scheduler, so tiers would never unlock. Its gating rule and acceptance criterion 3 must be
  rewritten to `STABLE_REPS`. Whichever spec ships first defines the constant.
- **Spec 04 (FSRS)** conflicts with shipped code: adopting it would undo the fixed cadences.
  Amend or retire it — decision pending, not addressed here.

## Non-goals

Reverse direction (meaning → word). Cross-deck words. A cap on very polysemous words.
No UI for editing senses — markdown is the editor.
