# Branching (decision-tree) decks — Design

_Date: 2026-06-06 · Scope: Shared parser + Server + Android · Slice 3 of #3 (full vertical: author + play)_

## Goal

Let a user author a **decision-tree deck** in Markdown — cards that present
options, where the option picked routes to a specific next card — and **play**
that tree on Android (choose-your-own-path). This is the headline "branching"
value of #3: answer-dependent routing, not spaced repetition.

A deck is a tree deck purely by inference: it contains at least one `branch`
card. Existing front/back decks are unaffected and continue to study via SM-2.

## Non-goals (this slice)

- **SM-2 / spaced repetition for tree decks.** Branch decks are interactive
  scenarios: no review events, excluded from due/stats counts. A deck is _either_
  a tree deck _or_ an SR deck — no mixing of branch and SR cards in one deck.
- **Web** support (gallery-frontend). Android + server only, as in prior slices.
- **Python desktop** parser parity (legacy surface).
- Authored "correctness" on options. A decision tree routes; it does not grade.

## A. Authoring — Markdown syntax (additive, backward-compatible)

Extends the existing parser. Decks with no `[label]` anchors and no `->` option
lines parse exactly as today.

- **Anchor:** a line `[label]` immediately above a card's front gives that card a
  label. Allowed characters: `a–z`, `A–Z`, `0–9`, `-`, `_`. Labels are unique
  within a deck. Anchors are optional; a card only needs one if another card's
  option targets it.
- **Option line:** after a card's front, a line of the form
  `- <option text> -> <target>` makes the card a **branch** card. `<target>` is
  another card's label, or the reserved word `end` (terminates the path).
  The arrow token is `->` (hyphen-greater, surrounded by spaces).
- **Branch vs basic:** a card with ≥1 option line is a `branch` card; its
  `prompt` is the front line plus any non-option text lines beneath it (joined as
  paragraphs, so narrative under the prompt is preserved, not dropped). Option
  lines may be interleaved with or follow that text; order of the options is
  preserved. A card with no option lines is a `basic` card (front/back) and acts
  as a **leaf** (terminal) node.
- **Entry node:** the first card in document order.
- Loops are allowed (`Retreat -> start`); only dangling targets are rejected.

### Worked example

```markdown
# Forest Path

[start]
**1. You reach a fork. Which way?**

- Go left toward the cave -> cave
- Go right toward the meadow -> meadow

[cave]
**2. A bear blocks the cave.**

- Sneak past -> treasure
- Retreat -> start

[meadow]
**3. A peaceful clearing.**
You rest here. The path ends.

[treasure]
**4. You found the treasure!**
You win.
```

`start` and `cave` are branch cards; `meadow` and `treasure` are basic leaves.

## B. Data model (no migration)

The `cards` table already has `type text DEFAULT 'basic'` and `content jsonb`.

- **branch card:** `type = 'branch'`,
  `content = { "label": "start", "prompt": "You reach a fork…", "options": [ { "text": "Go left…", "goto": "cave" }, … ] }`
- **basic card:** `type = 'basic'`,
  `content = { "label": "meadow", "front": "…", "back": "…" }` (`label` present only when the card is anchored)

`ParsedCard` (shared TS + Kotlin) gains optional `label`, optional `options`
(`Array<{ text: string; goto: string }>`), and a derived `type`. The server's
`insertCards`/`appendCards` serialize the richer content; basic cards keep the
existing `{ front, back }` shape plus an optional `label`.

## C. Validation (server import — `ValidationError` with a clear message)

Run only when the parsed deck contains ≥1 branch card:

1. **Unique labels:** duplicate `[label]` within a deck → error naming the label.
2. **Resolvable gotos:** every option `goto` is `end` or matches a label present
   in the deck → error naming the bad target and the source card.
3. **Branch shape:** a branch card has ≥1 option, each with non-empty text and a
   non-empty target.

Pure-basic decks skip all branch validation (behavior unchanged). Cycles are not
an error.

## D. Play engine + Android

- **API:** reuse `GET /api/decks/:id` — it already returns `cards` with
  `id, type, content, category, position`. No new endpoint. The Android
  deck-detail DTO + domain model gain `type` and the branch `content`
  (label/prompt/options), exposed as a typed `BranchNode` graph.
- **Routing into play:** when a deck's cards include any `branch` type, the
  deck's primary action is **Play** (decision-tree screen); otherwise **Study**
  (unchanged). Inferred client-side from the fetched cards.
- **`BranchPlayViewModel`:** builds a `Map<label, node>` from the deck cards,
  tracks the current node and a visited stack (for **Back**). Picking an option
  resolves its `goto` to the target node and makes it current; reaching `end` or
  a leaf shows a **Path complete** state with **Restart** (returns to the entry
  node). No review/progress writes, no SM-2 calls.
- **UI (Compose):** `BranchPlayScreen` shows the current node's prompt and a
  vertical list of option buttons; a leaf shows its front/back text with
  Done/Restart; a Back control pops the visited stack.

## E. Help / How-to screen (Android)

A standalone Compose `BranchingHelpScreen` (its own nav route) that explains how
to lay out a branching Markdown deck:

- What anchors (`[label]`) and option lines (`- text -> target`) do.
- `end` and leaf (no-options) cards terminate a path; the first card is the
  entry; loops are allowed.
- The rule that a deck with any branch card is played as a tree (and is not
  spaced-repetition).
- The full **Forest Path** worked example above, rendered in a monospace block.

Entry point: a "How branching works" text button on the **Create Deck** screen
(most contextual place, since that's where Markdown is pasted). The screen is
static content — no ViewModel, no network.

## F. Testing

- **Shared TS parser** (`packages/shared/src/markdown/parser.test.ts`): anchors
  parsed into `label`; option lines into `options` with correct `text`/`goto`;
  branch vs basic classification; the reserved `end` target; backward-compat
  (existing fixtures still produce identical basic cards); malformed lines
  (arrow without target, option before any front) handled gracefully.
- **Server validation** (`decks` domain test): unique-label violation,
  dangling-goto violation, and a happy-path import asserting the stored
  `type`/`content` for branch and leaf cards (mocked repo to capture the
  serialized `ParsedCard[]`).
- **Kotlin `MdParser`** (`android/app/src/test/.../MdParserBranchingTest.kt`):
  mirror the TS parser cases for parity (anchors, options, branch/basic,
  backward-compat).
- **`BranchPlayViewModel`** (mockk + coroutines-test): option pick routes to the
  named target; `end` and leaf reach the complete state; Back pops to the prior
  node; Restart returns to the entry node; a tree deck is detected from cards.
- `compileDebugKotlin` + full Android unit suite green; server + shared suites
  green.

## Out of scope (later passes of #3)

Sequence-aware SM-2, prerequisite-unlock series across decks, mixed SR+branch
decks, web authoring/play, Python desktop parity, branch authoring via a visual
editor.
