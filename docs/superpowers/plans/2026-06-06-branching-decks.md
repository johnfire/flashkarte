# Branching (decision-tree) decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a decision-tree deck in Markdown (cards with `[label]` anchors and `- text -> target` option lines) and play it on Android by picking options that route to target cards.

**Architecture:** Extend the shared TS parser and the Kotlin `MdParser` (parity) to emit `branch` cards carrying `label`/`options`; the server validates the graph at import and stores `type`+rich `content` jsonb (no migration). Android fetches the full card graph from the existing `GET /api/decks/:id`, and a new `BranchPlayViewModel`/`BranchPlayScreen` walks the graph. A static `BranchingHelpScreen` documents the syntax. Branch decks sit outside SM-2 (no review writes).

**Tech Stack:** TypeScript (Jest), Express + Postgres, Kotlin/Compose (mockk + coroutines-test).

**Spec:** docs/superpowers/specs/2026-06-06-branching-decks-design.md

---

## Shared types (used across tasks)

**TS `ParsedCard` (Task 1)** — the parser output shape every later task relies on:

```ts
export interface ParsedOption {
  text: string;
  goto: string;
}
export interface ParsedCard {
  type: "basic" | "branch";
  front: string; // branch: the prompt text; basic: the front
  back: string; // basic: the back; branch: ""
  category: string | null;
  label: string | null; // set when the card was anchored with [label]
  options: ParsedOption[]; // branch: ≥1; basic: []
}
```

**Stored `content` jsonb (Task 2):** branch → `{ label, prompt, options:[{text,goto}] }`; basic → `{ front, back }` plus `label` only when anchored.

**Kotlin `ParsedCard` (Task 3)** mirrors the TS shape: `type: String` (`"basic"`/`"branch"`), `front`, `back`, `category`, `label: String?`, `options: List<ParsedOption>`.

---

### Task 1: Shared TS parser — anchors + option lines

**Files:**

- Modify: `packages/shared/src/markdown/parser.ts`
- Test: `packages/shared/src/markdown/parser.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `parser.test.ts`:

```ts
import { parseDeck } from "./parser";

describe("branching syntax", () => {
  const md = `# Forest Path

[start]
**1. You reach a fork. Which way?**
- Go left toward the cave -> cave
- Go right -> meadow

[cave]
**2. A bear blocks the cave.**
- Sneak past -> treasure
- Retreat -> start

[meadow]
**3. A peaceful clearing.**
You rest here.
`;

  it("parses anchors, prompts and options", () => {
    const deck = parseDeck(md);
    const byLabel = Object.fromEntries(deck.cards.map((c) => [c.label, c]));
    expect(deck.cards).toHaveLength(3);
    const start = byLabel["start"];
    expect(start.type).toBe("branch");
    expect(start.front).toBe("You reach a fork. Which way?");
    expect(start.options).toEqual([
      { text: "Go left toward the cave", goto: "cave" },
      { text: "Go right", goto: "meadow" },
    ]);
    expect(byLabel["cave"].options[1]).toEqual({
      text: "Retreat",
      goto: "start",
    });
  });

  it("treats a card with no options as a basic leaf", () => {
    const deck = parseDeck(md);
    const meadow = deck.cards.find((c) => c.label === "meadow")!;
    expect(meadow.type).toBe("basic");
    expect(meadow.back).toBe("You rest here.");
    expect(meadow.options).toEqual([]);
  });

  it("supports the end target", () => {
    const deck = parseDeck(`# T\n\n**1. Stop?**\n- Yes -> end\n`);
    expect(deck.cards[0].options).toEqual([{ text: "Yes", goto: "end" }]);
  });

  it("is backward compatible with non-branching decks", () => {
    const deck = parseDeck(`# Plain\n\n**1. Q**\nAn answer.\n`);
    expect(deck.cards[0]).toMatchObject({
      type: "basic",
      front: "Q",
      back: "An answer.",
      label: null,
      options: [],
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/shared && npx jest parser`
Expected: FAIL (cards lack `type`/`label`/`options`).

- [ ] **Step 3: Implement parser changes**

Replace the whole contents of `packages/shared/src/markdown/parser.ts` with:

```ts
export interface ParsedOption {
  text: string;
  goto: string;
}

export interface ParsedCard {
  type: "basic" | "branch";
  front: string;
  back: string;
  category: string | null;
  label: string | null;
  options: ParsedOption[];
}

export interface ParsedDeck {
  title: string;
  sourceFilename: string;
  cards: ParsedCard[];
}

const H1 = /^# (.+)/;
const H2 = /^## (.+)/;
const FRONT = /^\*\*\d+\.\s(.+?)\*\*/;
const HR = /^---+$/;
const QFRONT = /^Q:\s*(.+)/;
const ABACK = /^A:\s*(.+)/;
// Branching: an anchor line [label], and option lines "- text -> target".
const ANCHOR = /^\[([A-Za-z0-9_-]+)\]\s*$/;
const OPTION = /^-\s+(.+?)\s+->\s+(\S+)\s*$/;

/**
 * Parse Markdown deck text into a ParsedDeck.
 * Ported verbatim from python/flashmd/parser/md_parser.py and mirrored in
 * Kotlin (android .../data/parser/MdParser.kt) — keep all three in sync.
 */
export function parseDeck(text: string, sourceFilename = ""): ParsedDeck {
  const lines = text.split("\n");

  let title = "";
  let currentCategory: string | null = null;
  let currentFront: string | null = null;
  let currentIsQA = false;
  let currentLabel: string | null = null;
  let pendingLabel: string | null = null;
  let backLines: string[] = [];
  let options: ParsedOption[] = [];
  const cards: ParsedCard[] = [];

  const flush = () => {
    if (currentFront !== null) {
      cards.push({
        type: options.length > 0 ? "branch" : "basic",
        front: currentFront,
        back: options.length > 0 ? "" : cleanBack(backLines),
        category: currentCategory,
        label: currentLabel,
        options,
      });
    }
    currentFront = null;
    currentLabel = null;
    backLines = [];
    options = [];
  };

  const openCard = (front: string, isQA: boolean) => {
    flush();
    currentFront = front;
    currentIsQA = isQA;
    currentLabel = pendingLabel;
    pendingLabel = null;
  };

  for (const line of lines) {
    const mH1 = H1.exec(line);
    const mH2 = H2.exec(line);
    const mFront = FRONT.exec(line);
    const mQ = QFRONT.exec(line);
    const mA = ABACK.exec(line);
    const mAnchor = ANCHOR.exec(line);
    const mOption = currentFront !== null ? OPTION.exec(line) : null;

    if (mH1 && !title) {
      title = mH1[1].trim();
    } else if (mAnchor) {
      pendingLabel = mAnchor[1];
    } else if (mH2) {
      flush();
      currentCategory = mH2[1].trim();
    } else if (HR.test(line)) {
      // separator, ignore
    } else if (mFront) {
      openCard(mFront[1].trim(), false);
    } else if (mQ) {
      openCard(mQ[1].trim(), true);
    } else if (mOption) {
      options.push({ text: mOption[1].trim(), goto: mOption[2].trim() });
    } else if (
      mA &&
      currentFront !== null &&
      currentIsQA &&
      backLines.every((l) => !l.trim())
    ) {
      backLines.push(mA[1].trim());
      backLines.push("");
    } else if (currentFront !== null) {
      backLines.push(line);
    }
  }
  flush();

  if (!title) title = sourceFilename;

  return { title, sourceFilename, cards };
}

function cleanBack(lines: string[]): string {
  const buf = [...lines];
  while (buf.length && !buf[0].trim()) buf.shift();
  while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
  if (buf.length === 0) return "";

  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of buf) {
    if (line.trim()) {
      current.push(line.trim());
    } else if (current.length) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) paragraphs.push(current.join(" "));

  return paragraphs.join("\n\n");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/shared && npx jest parser`
Expected: PASS (all branching + existing tests).

- [ ] **Step 5: Rebuild shared dist (server imports it)**

Run: `cd packages/shared && npm run build`
Expected: succeeds; `dist/markdown/parser.d.ts` now shows the new `ParsedCard` fields.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/markdown/parser.ts packages/shared/src/markdown/parser.test.ts packages/shared/dist
git commit -m "feat(shared): parse [label] anchors + '- text -> goto' branch options (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Server — branch-aware storage + import validation

**Files:**

- Create: `packages/server/src/domains/decks/branching.ts`
- Test: `packages/server/src/domains/decks/branching.test.ts`
- Modify: `packages/server/src/domains/decks/decks.repository.ts` (`insertCards`, `appendCards`, `getCards` type)
- Modify: `packages/server/src/domains/decks/decks.service.ts` (`importDeck`, `appendCards`)
- Test: `packages/server/src/domains/decks/decks.routes.test.ts`

- [ ] **Step 1: Write failing validator tests**

Create `packages/server/src/domains/decks/branching.test.ts`:

```ts
import { validateBranching } from "./branching";
import type { ParsedCard } from "@flashkarte/shared";

const basic = (front: string): ParsedCard => ({
  type: "basic",
  front,
  back: "b",
  category: null,
  label: null,
  options: [],
});
const branch = (label: string, opts: [string, string][]): ParsedCard => ({
  type: "branch",
  front: "p",
  back: "",
  category: null,
  label,
  options: opts.map(([text, goto]) => ({ text, goto })),
});

describe("validateBranching", () => {
  it("passes a deck with no branch cards", () => {
    expect(() => validateBranching([basic("x"), basic("y")])).not.toThrow();
  });

  it("passes resolvable gotos and end", () => {
    expect(() =>
      validateBranching([
        branch("start", [
          ["go", "leaf"],
          ["stop", "end"],
        ]),
        { ...basic("l"), label: "leaf" },
      ]),
    ).not.toThrow();
  });

  it("rejects a dangling goto", () => {
    expect(() =>
      validateBranching([branch("start", [["go", "nowhere"]])]),
    ).toThrow(/nowhere/);
  });

  it("rejects duplicate labels", () => {
    expect(() =>
      validateBranching([
        branch("dup", [["a", "end"]]),
        branch("dup", [["b", "end"]]),
      ]),
    ).toThrow(/dup/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/server && npx jest branching`
Expected: FAIL (`validateBranching` not found).

- [ ] **Step 3: Implement the validator**

Create `packages/server/src/domains/decks/branching.ts`:

```ts
import type { ParsedCard } from "@flashkarte/shared";
import { ValidationError } from "../../utils/errors";

/**
 * Validate the graph of a parsed deck when it contains branch cards.
 * No-op for pure front/back decks. Cycles are allowed; only dangling targets,
 * duplicate labels, and empty option fields are rejected.
 */
export function validateBranching(cards: ParsedCard[]): void {
  if (!cards.some((c) => c.type === "branch")) return;

  const labels = new Set<string>();
  for (const c of cards) {
    if (c.label === null) continue;
    if (labels.has(c.label)) {
      throw new ValidationError(`Duplicate card label "${c.label}"`);
    }
    labels.add(c.label);
  }

  for (const c of cards) {
    if (c.type !== "branch") continue;
    if (c.options.length === 0) {
      throw new ValidationError(`Branch card "${c.front}" has no options`);
    }
    for (const o of c.options) {
      if (!o.text.trim() || !o.goto.trim()) {
        throw new ValidationError(
          `Branch card "${c.front}" has an empty option`,
        );
      }
      if (o.goto !== "end" && !labels.has(o.goto)) {
        throw new ValidationError(
          `Option "${o.text}" points to unknown card "${o.goto}"`,
        );
      }
    }
  }
}
```

- [ ] **Step 4: Run validator tests (green)**

Run: `cd packages/server && npx jest branching`
Expected: PASS (4 tests).

- [ ] **Step 5: Serialize branch content in the repository**

In `decks.repository.ts`, add a helper above `insertCards` and use it in both `insertCards` and `appendCards`. Replace the literal `'basic'` type and the `JSON.stringify({ front, back })` content in both INSERTs.

Add the helper (after the imports / before `insertCards`):

```ts
function cardContent(c: ParsedCard): string {
  if (c.type === "branch") {
    return JSON.stringify({
      label: c.label,
      prompt: c.front,
      options: c.options,
    });
  }
  return JSON.stringify(
    c.label
      ? { front: c.front, back: c.back, label: c.label }
      : { front: c.front, back: c.back },
  );
}
```

In `insertCards`, change the INSERT to:

```ts
await query(
  `INSERT INTO cards (user_id, deck_id, type, content, category, position)
       VALUES ($1, $2, $3, $4, $5, $6)`,
  [userId, deckId, c.type, cardContent(c), c.category, i++],
);
```

In `appendCards`, make the identical change (params `$1..$6` with `c.type`, `cardContent(c)`).

Also widen the `getCards` row content type so branch cards type-check:

```ts
export function getCards(userId: string, deckId: string) {
  return query<{
    id: string;
    type: string;
    content: Record<string, unknown>;
    category: string | null;
    position: number;
  }>(
    `SELECT id, type, content, category, position FROM cards
     WHERE deck_id = $1 AND user_id = $2 ORDER BY position ASC`,
    [deckId, userId],
  );
}
```

- [ ] **Step 6: Call the validator from the service**

In `decks.service.ts`, add the import and call `validateBranching(parsed.cards)` right after each `parseDeck(...)` (both `importDeck` and `appendCards`), before the `parsed.cards.length === 0` check is fine either way; place it immediately after the empty-check.

```ts
import { parseDeck } from "@flashkarte/shared";
import { validateBranching } from "./branching";
```

In `importDeck`, after the `if (parsed.cards.length === 0) { ... }` block:

```ts
validateBranching(parsed.cards);
```

In `appendCards`, after its `if (parsed.cards.length === 0) { ... }` block:

```ts
validateBranching(parsed.cards);
```

- [ ] **Step 7: Add a route-level import test**

In `decks.routes.test.ts`, add (inside the existing describe; this file mocks the decks service, so assert the service is called — the validator itself is covered in Task 2 Step 1). If the file mocks `decks.service`, mirror an existing import test and assert a malformed branch deck surfaces the service error. If wiring a service-level test is simpler, add to `decks.service` a focused test instead:

Create `packages/server/src/domains/decks/decks.service.branching.test.ts`:

```ts
jest.mock("./decks.repository");
import * as repo from "./decks.repository";
import { importDeck } from "./decks.service";

const mock = repo as jest.Mocked<typeof repo>;

beforeEach(() => {
  jest.clearAllMocks();
  mock.createDeck.mockResolvedValue({ id: "d1", title: "T" } as never);
  mock.insertCards.mockResolvedValue(undefined as never);
});

it("rejects a deck whose option points nowhere", async () => {
  const md = `# T\n\n**1. Pick**\n- Go -> ghost\n`;
  await expect(importDeck("u1", md, "t.md")).rejects.toThrow(/ghost/);
  expect(mock.insertCards).not.toHaveBeenCalled();
});

it("imports a valid branch deck and stores branch + leaf cards", async () => {
  const md = `# T\n\n[start]\n**1. Pick**\n- Go -> leaf\n\n[leaf]\n**2. Done**\nbye\n`;
  await importDeck("u1", md, "t.md");
  const cards = mock.insertCards.mock.calls[0][2];
  expect(cards[0]).toMatchObject({ type: "branch", label: "start" });
  expect(cards[1]).toMatchObject({ type: "basic", label: "leaf", back: "bye" });
});
```

- [ ] **Step 8: Run server tests + build**

Run: `cd packages/server && npx jest branching decks && npm run build`
Expected: PASS; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add packages/server/src/domains/decks
git commit -m "feat(server): validate + store branch cards on import (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Kotlin MdParser parity

**Files:**

- Modify: `android/app/src/main/java/com/flashmd/data/parser/MdParser.kt`
- Test: `android/app/src/test/java/com/flashmd/data/parser/MdParserBranchingTest.kt`

- [ ] **Step 1: Write failing parity tests**

Create `android/app/src/test/java/com/flashmd/data/parser/MdParserBranchingTest.kt`:

```kotlin
package com.flashmd.data.parser

import org.junit.Assert.assertEquals
import org.junit.Test

class MdParserBranchingTest {
    private val md = """
        # Forest Path

        [start]
        **1. You reach a fork. Which way?**
        - Go left -> cave
        - Go right -> meadow

        [meadow]
        **2. A clearing.**
        You rest here.
    """.trimIndent()

    @Test fun parsesAnchorsAndOptions() {
        val deck = MdParser.parse(md)
        val start = deck.cards.first { it.label == "start" }
        assertEquals("branch", start.type)
        assertEquals("You reach a fork. Which way?", start.front)
        assertEquals(listOf(ParsedOption("Go left", "cave"), ParsedOption("Go right", "meadow")), start.options)
    }

    @Test fun leafHasNoOptions() {
        val deck = MdParser.parse(md)
        val meadow = deck.cards.first { it.label == "meadow" }
        assertEquals("basic", meadow.type)
        assertEquals("You rest here.", meadow.back)
        assertEquals(emptyList<ParsedOption>(), meadow.options)
    }

    @Test fun backwardCompatible() {
        val deck = MdParser.parse("# Plain\n\n**1. Q**\nAn answer.\n")
        val c = deck.cards.single()
        assertEquals("basic", c.type)
        assertEquals(null, c.label)
        assertEquals(emptyList<ParsedOption>(), c.options)
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.data.parser.MdParserBranchingTest"`
Expected: FAIL (compile error: `type`/`label`/`options`/`ParsedOption` undefined).

- [ ] **Step 3: Implement parity in `MdParser.kt`**

Replace the `ParsedCard` data class and the `MdParser` object body with:

```kotlin
data class ParsedOption(
    val text: String,
    val goto: String,
)

data class ParsedCard(
    val type: String,           // "basic" | "branch"
    val front: String,
    val back: String,
    val category: String?,
    val label: String?,
    val options: List<ParsedOption>,
)
```

Then update the `MdParser` object: add the two regexes and the label/option tracking. Replace the parse loop body to match the TS port:

```kotlin
object MdParser {
    private val H1 = Regex("""^# (.+)""")
    private val H2 = Regex("""^## (.+)""")
    private val FRONT = Regex("""^\*\*\d+\.\s(.+?)\*\*""")
    private val HR = Regex("""^---+$""")
    private val QFRONT = Regex("""^Q:\s*(.+)""")
    private val ABACK = Regex("""^A:\s*(.+)""")
    private val ANCHOR = Regex("""^\[([A-Za-z0-9_-]+)\]\s*$""")
    private val OPTION = Regex("""^-\s+(.+?)\s+->\s+(\S+)\s*$""")

    fun parse(text: String, sourceFile: String = ""): ParsedDeck {
        val lines = text.lines()
        var title = ""
        var currentCategory: String? = null
        var currentFront: String? = null
        var currentIsQA = false
        var currentLabel: String? = null
        var pendingLabel: String? = null
        val backLines = mutableListOf<String>()
        var options = mutableListOf<ParsedOption>()
        val cards = mutableListOf<ParsedCard>()

        fun flushCard() {
            val front = currentFront ?: return
            cards += ParsedCard(
                type = if (options.isNotEmpty()) "branch" else "basic",
                front = front,
                back = if (options.isNotEmpty()) "" else cleanBack(backLines.toList()),
                category = currentCategory,
                label = currentLabel,
                options = options.toList(),
            )
            currentFront = null
            currentLabel = null
            backLines.clear()
            options = mutableListOf()
        }

        fun openCard(front: String, isQA: Boolean) {
            flushCard()
            currentFront = front
            currentIsQA = isQA
            currentLabel = pendingLabel
            pendingLabel = null
        }

        for (line in lines) {
            val mH1 = H1.find(line)
            val mH2 = H2.find(line)
            val mFront = FRONT.find(line)
            val mQ = QFRONT.find(line)
            val mA = ABACK.find(line)
            val mAnchor = ANCHOR.find(line)
            val mOption = if (currentFront != null) OPTION.find(line) else null

            when {
                mH1 != null && title.isEmpty() -> title = mH1.groupValues[1].trim()
                mAnchor != null -> pendingLabel = mAnchor.groupValues[1]
                mH2 != null -> {
                    flushCard()
                    currentCategory = mH2.groupValues[1].trim()
                }
                HR.matches(line) -> { /* separator, skip */ }
                mFront != null -> openCard(mFront.groupValues[1].trim(), false)
                mQ != null -> openCard(mQ.groupValues[1].trim(), true)
                mOption != null ->
                    options += ParsedOption(mOption.groupValues[1].trim(), mOption.groupValues[2].trim())
                mA != null && currentFront != null && currentIsQA &&
                    backLines.all { it.isBlank() } -> {
                    backLines += mA.groupValues[1].trim()
                    backLines += ""
                }
                currentFront != null -> backLines += line
            }
        }
        flushCard()

        return ParsedDeck(
            title = title.ifEmpty { sourceFile },
            sourceFile = sourceFile,
            cards = cards,
        )
    }

    private fun cleanBack(lines: List<String>): String {
        val trimmed = lines.dropWhile { it.isBlank() }.dropLastWhile { it.isBlank() }
        if (trimmed.isEmpty()) return ""

        val paragraphs = mutableListOf<String>()
        val current = mutableListOf<String>()

        for (line in trimmed) {
            if (line.isBlank()) {
                if (current.isNotEmpty()) {
                    paragraphs += current.joinToString(" ") { it.trim() }
                    current.clear()
                }
            } else {
                current += line
            }
        }
        if (current.isNotEmpty()) paragraphs += current.joinToString(" ") { it.trim() }

        return paragraphs.joinToString("\n\n")
    }
}
```

**Note:** `CreateDeckViewModel`/`DeckListViewModel` call `MdParser.parse(...)` only to count `parsed.cards` for a preview/validation; the new fields are additive, so those call sites keep compiling unchanged.

- [ ] **Step 4: Run parity tests (green)**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.data.parser.MdParserBranchingTest"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/parser/MdParser.kt android/app/src/test/java/com/flashmd/data/parser/MdParserBranchingTest.kt
git commit -m "feat(android): MdParser branch-syntax parity (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Android — deck-detail graph DTO + domain model + repo + is_branching list flag

**Files:**

- Modify: `packages/server/src/domains/decks/decks.repository.ts` (`listDecksWithCounts` — add `is_branching`)
- Modify: `android/app/src/main/java/com/flashmd/data/remote/dto/Dtos.kt`
- Create: `android/app/src/main/java/com/flashmd/domain/model/DeckNode.kt`
- Modify: `android/app/src/main/java/com/flashmd/domain/model/Deck.kt`
- Modify: `android/app/src/main/java/com/flashmd/data/repository/DeckRepository.kt`

- [ ] **Step 1: Server — expose `is_branching` on the deck list**

In `decks.repository.ts` `listDecksWithCounts`, add to the LATERAL subselect `s`:

```sql
         COALESCE(bool_or(c.type = 'branch'), false) AS is_branching,
```

(place it on its own line inside the `SELECT ... FROM cards c` aggregate, e.g. after the `count(... ) AS easy` line), and add `s.is_branching` to the outer SELECT list (after `s.easy AS easy_count,`). Also add `is_branching: boolean;` to the `DeckListRow` interface. **The `COALESCE` matters:** a deck with zero cards makes `bool_or` return SQL `NULL`, and kotlinx.serialization throws on a JSON `null` for the non-nullable `DeckListItemDto.isBranching: Boolean` — coalescing to `false` keeps it a real boolean.

- [ ] **Step 2: Server — quick check it still parses/builds**

Run: `cd packages/server && npm run build && npx jest decks`
Expected: build OK; decks tests green (mocked, unaffected).

- [ ] **Step 3: Android DTOs — full card graph + list flag**

In `Dtos.kt`: add `@SerialName("is_branching") val isBranching: Boolean = false` to `DeckListItemDto`; add a `cards` field and supporting DTOs for the detail response.

Add to `DeckDetailDto` (new field):

```kotlin
    val cards: List<DeckCardDto> = emptyList(),
```

Add these DTOs (near the other deck DTOs):

```kotlin
@Serializable
data class DeckCardDto(
    val id: String,
    val type: String = "basic",
    val content: DeckCardContentDto = DeckCardContentDto(),
    val category: String? = null,
    val position: Int = 0,
)

@Serializable
data class DeckCardContentDto(
    val front: String = "",
    val back: String = "",
    val prompt: String = "",
    val label: String? = null,
    val options: List<BranchOptionDto> = emptyList(),
)

@Serializable
data class BranchOptionDto(
    val text: String = "",
    val goto: String = "",
)
```

- [ ] **Step 4: Domain model — `DeckNode` + `Deck.isBranching`**

Create `android/app/src/main/java/com/flashmd/domain/model/DeckNode.kt`:

```kotlin
package com.flashmd.domain.model

data class BranchOption(val text: String, val goto: String)

data class DeckNode(
    val id: String,
    val type: String,        // "basic" | "branch"
    val label: String?,
    val prompt: String,      // branch prompt OR basic front
    val back: String,        // basic back; "" for branch
    val options: List<BranchOption>,
    val position: Int,
)
```

In `Deck.kt`, add `val isBranching: Boolean = false,` after `isOrdered`.

- [ ] **Step 5: Repository — map list flag + add `getDeckGraph`**

In `DeckRepository.kt`, wherever `DeckListItemDto` is mapped to `Deck` (the list `toDomain()` mapper), add `isBranching = it.isBranching,`. In `getDeckById`'s `Deck(...)` add `isBranching = it.cards.any { c -> c.type == "branch" },`. Add a graph fetch:

```kotlin
    suspend fun getDeckGraph(id: String): List<DeckNode> =
        apiCall { api.getDeck(id) }.cards.map { c ->
            DeckNode(
                id = c.id,
                type = c.type,
                label = c.content.label,
                prompt = if (c.type == "branch") c.content.prompt else c.content.front,
                back = c.content.back,
                options = c.content.options.map { o -> BranchOption(o.text, o.goto) },
                position = c.position,
            )
        }
```

Add the imports `import com.flashmd.domain.model.DeckNode` and `import com.flashmd.domain.model.BranchOption` at the top of `DeckRepository.kt`.

- [ ] **Step 6: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/domains/decks/decks.repository.ts android/app/src/main/java/com/flashmd/data/remote/dto/Dtos.kt android/app/src/main/java/com/flashmd/domain/model/DeckNode.kt android/app/src/main/java/com/flashmd/domain/model/Deck.kt android/app/src/main/java/com/flashmd/data/repository/DeckRepository.kt
git commit -m "feat(android): deck graph DTO/model + is_branching flag (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Android — BranchPlayViewModel (TDD)

**Files:**

- Create: `android/app/src/main/java/com/flashmd/ui/screens/play/BranchPlayViewModel.kt`
- Test: `android/app/src/test/java/com/flashmd/ui/BranchPlayViewModelTest.kt`

- [ ] **Step 1: Write the failing test**

Create `android/app/src/test/java/com/flashmd/ui/BranchPlayViewModelTest.kt`:

```kotlin
package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.DeckNode
import com.flashmd.ui.screens.play.BranchPlayViewModel
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class BranchPlayViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)

    private val graph = listOf(
        DeckNode("1", "branch", "start", "Fork?", "", listOf(
            BranchOption("Left", "cave"), BranchOption("Right", "end")), 0),
        DeckNode("2", "basic", "cave", "A cave", "Dark and cold.", emptyList(), 1),
    )

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        coEvery { deckRepo.getDeckGraph("d1") } returns graph
    }
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = BranchPlayViewModel(
        deckRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")),
    )

    @Test fun startsAtEntryNode() = runTest {
        val vm = vm(); advanceUntilIdle()
        assertEquals("start", vm.uiState.value.current?.label)
    }

    @Test fun choosingOptionRoutesToTarget() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Left", "cave"))
        assertEquals("cave", vm.uiState.value.current?.label)
        assertTrue(vm.uiState.value.canGoBack)
    }

    @Test fun endTargetCompletesThePath() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Right", "end"))
        assertTrue(vm.uiState.value.isComplete)
    }

    @Test fun backReturnsToPriorNode() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Left", "cave"))
        vm.back()
        assertEquals("start", vm.uiState.value.current?.label)
    }

    @Test fun restartReturnsToEntry() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Right", "end"))
        vm.restart()
        assertEquals("start", vm.uiState.value.current?.label)
        assertTrue(!vm.uiState.value.isComplete)
    }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.BranchPlayViewModelTest"`
Expected: FAIL (compile error: `BranchPlayViewModel` undefined).

- [ ] **Step 3: Implement the ViewModel**

Create `android/app/src/main/java/com/flashmd/ui/screens/play/BranchPlayViewModel.kt`:

```kotlin
package com.flashmd.ui.screens.play

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.DeckNode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BranchPlayUiState(
    val current: DeckNode? = null,
    val isComplete: Boolean = false,
    val canGoBack: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class BranchPlayViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val errorReporter: ErrorReporter,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val deckId: String = checkNotNull(savedStateHandle["deckId"])

    private var byLabel: Map<String, DeckNode> = emptyMap()
    private var entry: DeckNode? = null
    private val history = ArrayDeque<DeckNode>()

    private val _uiState = MutableStateFlow(BranchPlayUiState())
    val uiState: StateFlow<BranchPlayUiState> = _uiState

    init {
        viewModelScope.launch {
            try {
                val nodes = deckRepo.getDeckGraph(deckId)
                byLabel = nodes.filter { it.label != null }.associateBy { it.label!! }
                entry = nodes.minByOrNull { it.position }
                _uiState.value = BranchPlayUiState(current = entry, isLoading = false)
            } catch (e: ApiException) {
                _uiState.value = BranchPlayUiState(isLoading = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "play load failed", "BranchPlay.init", e)
                _uiState.value = BranchPlayUiState(
                    isLoading = false, error = "Couldn't load this scenario.",
                )
            }
        }
    }

    fun choose(option: BranchOption) {
        val cur = _uiState.value.current ?: return
        if (option.goto == "end") {
            history.addLast(cur)
            _uiState.value = _uiState.value.copy(isComplete = true, canGoBack = history.isNotEmpty())
            return
        }
        val target = byLabel[option.goto]
        if (target == null) {
            _uiState.value = _uiState.value.copy(error = "Dead end: \"${option.goto}\" not found.")
            return
        }
        history.addLast(cur)
        _uiState.value = _uiState.value.copy(current = target, canGoBack = true)
    }

    fun finishLeaf() {
        val cur = _uiState.value.current ?: return
        history.addLast(cur)
        _uiState.value = _uiState.value.copy(isComplete = true)
    }

    fun back() {
        if (history.isEmpty()) return
        val prev = history.removeLast()
        _uiState.value = _uiState.value.copy(
            current = prev, isComplete = false, canGoBack = history.isNotEmpty(),
        )
    }

    fun restart() {
        history.clear()
        _uiState.value = BranchPlayUiState(current = entry, isLoading = false)
    }
}
```

- [ ] **Step 4: Run the ViewModel tests (green)**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.BranchPlayViewModelTest"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/play/BranchPlayViewModel.kt android/app/src/test/java/com/flashmd/ui/BranchPlayViewModelTest.kt
git commit -m "feat(android): BranchPlayViewModel graph navigation (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Android — BranchPlayScreen + nav route + Play vs Study

**Files:**

- Create: `android/app/src/main/java/com/flashmd/ui/screens/play/BranchPlayScreen.kt`
- Modify: `android/app/src/main/java/com/flashmd/ui/navigation/NavGraph.kt`
- Modify: `android/app/src/main/java/com/flashmd/ui/screens/decklist/DeckListScreen.kt`

- [ ] **Step 1: Create the play screen**

Create `android/app/src/main/java/com/flashmd/ui/screens/play/BranchPlayScreen.kt`:

```kotlin
package com.flashmd.ui.screens.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BranchPlayScreen(
    onBack: () -> Unit,
    viewModel: BranchPlayViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scenario") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Close") } },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                state.isLoading -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
                state.error != null -> Text(state.error!!, color = MaterialTheme.colorScheme.error)
                state.isComplete -> {
                    Text("Path complete.", style = MaterialTheme.typography.headlineSmall)
                    Button(onClick = viewModel::restart, modifier = Modifier.fillMaxWidth()) {
                        Text("Restart")
                    }
                }
                else -> {
                    val node = state.current
                    if (node != null) {
                        Text(node.prompt, style = MaterialTheme.typography.titleLarge)
                        if (node.type == "branch") {
                            node.options.forEach { opt ->
                                Button(
                                    onClick = { viewModel.choose(opt) },
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text(opt.text) }
                            }
                        } else {
                            if (node.back.isNotBlank()) {
                                Text(node.back, style = MaterialTheme.typography.bodyLarge)
                            }
                            Button(onClick = viewModel::finishLeaf, modifier = Modifier.fillMaxWidth()) {
                                Text("Done")
                            }
                        }
                        if (state.canGoBack) {
                            OutlinedButton(onClick = viewModel::back, modifier = Modifier.fillMaxWidth()) {
                                Text("Back")
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Add the nav route**

In `NavGraph.kt`, add the import `import com.flashmd.ui.screens.play.BranchPlayScreen`, and add a composable (mirroring the `study/{deckId}` block):

```kotlin
            composable(
                route = "play/{deckId}",
                arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
            ) {
                BranchPlayScreen(onBack = { navController.popBackStack() })
            }
```

In the `decks` composable, extend the call to pass a play handler:

```kotlin
                    onPlayDeck = { deckId -> navController.navigate("play/$deckId") },
```

(Add it next to the existing `onStudyDeck = ...` line.)

- [ ] **Step 3: Deck list — Play vs Study button**

In `DeckListScreen.kt`: add `onPlayDeck: (String) -> Unit,` to the screen's parameter list (next to `onStudyDeck`). In the `items(...)` block pass `onPlay = { onPlayDeck(row.deck.id) },` to the `DeckCard`. Add `onPlay: () -> Unit,` to `DeckCard`'s signature, and replace the existing Study button (`Button(onClick = onStudy) { Text("Study") }`) with:

```kotlin
            if (row.deck.isBranching) {
                Button(onClick = onPlay) { Text("Play") }
            } else {
                Button(onClick = onStudy) { Text("Study") }
            }
```

(`row.deck.isBranching` comes from Task 4. Confirm the local variable name for the row item in the `items` lambda matches the file — it uses `row`.)

- [ ] **Step 4: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/play/BranchPlayScreen.kt android/app/src/main/java/com/flashmd/ui/navigation/NavGraph.kt android/app/src/main/java/com/flashmd/ui/screens/decklist/DeckListScreen.kt
git commit -m "feat(android): branch play screen + Play/Study routing (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Android — BranchingHelpScreen + entry point

**Files:**

- Create: `android/app/src/main/java/com/flashmd/ui/screens/help/BranchingHelpScreen.kt`
- Modify: `android/app/src/main/java/com/flashmd/ui/navigation/NavGraph.kt`
- Modify: `android/app/src/main/java/com/flashmd/ui/screens/createdeck/CreateDeckScreen.kt`

- [ ] **Step 1: Create the help screen**

Create `android/app/src/main/java/com/flashmd/ui/screens/help/BranchingHelpScreen.kt`:

```kotlin
package com.flashmd.ui.screens.help

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

private val EXAMPLE = """
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
""".trim()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BranchingHelpScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Branching decks") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text("Make a choose-your-path deck", style = MaterialTheme.typography.titleLarge)
            Text(
                "A branching deck is played, not reviewed. The reader picks an " +
                    "option on each card and jumps to the card it points to.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer16()
            Text("Rules", style = MaterialTheme.typography.titleMedium)
            Text(
                "• Give a card a name with a line like [cave] just above its question.\n" +
                    "• Under a question, add options:  - Some choice -> cave\n" +
                    "• The target is another card's name, or 'end' to finish the path.\n" +
                    "• A card with no options is a leaf: it ends the path.\n" +
                    "• The first card is where play starts. Loops are allowed.\n" +
                    "• Any deck that has at least one option card becomes a branching deck.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer16()
            Text("Example", style = MaterialTheme.typography.titleMedium)
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxSize().padding(top = 8.dp),
            ) {
                Text(
                    EXAMPLE,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(12.dp),
                )
            }
        }
    }
}

@Composable
private fun Spacer16() {
    androidx.compose.foundation.layout.Spacer(Modifier.padding(8.dp))
}
```

- [ ] **Step 2: Add the nav route + wire the Create Deck entry point**

In `NavGraph.kt`, add `import com.flashmd.ui.screens.help.BranchingHelpScreen`, change the `decks/new` composable to pass an `onHowTo` handler, and add the help route:

```kotlin
            composable("decks/new") {
                CreateDeckScreen(
                    onDone = { navController.popBackStack() },
                    onHowTo = { navController.navigate("branching-help") },
                )
            }
            composable("branching-help") {
                BranchingHelpScreen(onBack = { navController.popBackStack() })
            }
```

(Replace the existing single-arg `CreateDeckScreen(onDone = ...)` call.)

- [ ] **Step 3: Add the link on CreateDeckScreen**

In `CreateDeckScreen.kt`, add `onHowTo: () -> Unit,` to the function signature (after `onDone`). Add a `TextButton` below the "Create deck" button (inside the existing `Column`):

```kotlin
            TextButton(onClick = onHowTo) {
                Text("How to make a branching deck")
            }
```

Add the import `import androidx.compose.material3.TextButton` if not already present.

- [ ] **Step 4: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/help/BranchingHelpScreen.kt android/app/src/main/java/com/flashmd/ui/navigation/NavGraph.kt android/app/src/main/java/com/flashmd/ui/screens/createdeck/CreateDeckScreen.kt
git commit -m "feat(android): branching how-to help screen (#3)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Full verification

- [ ] **Step 1: Shared + server suites + builds**

Run: `cd packages/shared && npm test && npm run build && cd ../server && npm test && npm run build`
Expected: all green; builds succeed.

- [ ] **Step 2: Android compile + full unit suite**

Run: `cd android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL; all unit tests green (parser parity + BranchPlay + existing).

- [ ] **Step 3: Manual smoke (optional, recommended before ship)**

Import this deck via the app's "New deck → Paste Markdown", then open it (button reads **Play**), and walk: Left → cave → Sneak past → treasure (Done). Use the worked example from `BranchingHelpScreen`.

- [ ] **Step 4: Ship** — push to `main` after user green-light. Server (no migration) + Android build via CI. Then comment on #3 that slice 3 (branching author + play) landed and what remains.

---

## Out of scope (later passes of #3)

Sequence-aware SM-2, prerequisite-unlock series across decks, mixed SR+branch
decks, web authoring/play, Python desktop parity, a visual branch editor, and
cross-batch `goto` validation in `appendCards` (each append batch is validated
on its own; authoring a tree in one import is the supported path).
