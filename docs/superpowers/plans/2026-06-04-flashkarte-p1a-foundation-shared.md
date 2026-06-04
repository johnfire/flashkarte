# flashkarte Phase 1A — Monorepo Foundation + Shared Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the npm-workspaces monorepo and a `@flashkarte/shared` package containing the Markdown deck parser and the SM-2 algorithm, both ported to TypeScript and locked to the existing Python/Kotlin behaviour by parity tests.

**Architecture:** A private root workspace (`packages/*`) alongside the existing `android/` and `python/` dirs. `packages/shared` exports pure functions (no I/O) that the backend (Phase 1B) and web (Phase 1C) both consume, so parser + scheduling logic has a single source of truth.

**Tech Stack:** TypeScript 5, Jest + ts-jest, npm workspaces.

> **Plan series (Phase 1):** 1A foundation+shared (this doc) → 1B backend → 1C frontend → 1D docker+CI deploy. Each produces working, testable software on its own. Build in order.

> **Spec:** `docs/superpowers/specs/2026-06-04-flashkarte-phase1-mvp-design.md` (sections 5 & 6 define the format and algorithm this plan ports).

---

### Task 1: Root monorepo scaffold

**Files:**

- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.prettierrc`

- [ ] **Step 1: Create the root workspace `package.json`**

```json
{
  "name": "flashkarte",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "build": "npm run build --workspaces --if-present"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  }
}
```

- [ ] **Step 3: Create root `.gitignore`** (android/ and python/ keep their own)

```
node_modules/
dist/
*.log
.DS_Store
.env
coverage/
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": true,
  "trailingComma": "all",
  "doubleQuote": false
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.base.json .gitignore .prettierrc
git commit -m "chore: scaffold npm-workspaces monorepo root"
```

---

### Task 2: `@flashkarte/shared` package skeleton

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/jest.config.js`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@flashkarte/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "jest"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/shared/jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
};
```

- [ ] **Step 4: Create placeholder `packages/shared/src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Install workspace deps from the repo root**

Run: `npm install`
Expected: `node_modules/` created, `@flashkarte/shared` linked, no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/package.json packages/shared/tsconfig.json packages/shared/jest.config.js packages/shared/src/index.ts package-lock.json
git commit -m "chore: add @flashkarte/shared package skeleton"
```

---

### Task 3: SM-2 algorithm (port + parity tests)

Ports `python/flashmd/sm2/algorithm.py` (identical to `android/.../Sm2Algorithm.kt`). Rating 1–5; interval uses the **old** easiness; EF floor 1.3.

**Files:**

- Test: `packages/shared/src/sm2/sm2.test.ts`
- Create: `packages/shared/src/sm2/sm2.ts`

- [ ] **Step 1: Write the failing parity test** (`packages/shared/src/sm2/sm2.test.ts`)

```ts
import { calculate, Sm2State } from "./sm2";

const S = (
  easiness: number,
  interval: number,
  repetitions: number,
): Sm2State => ({
  easiness,
  interval,
  repetitions,
});

describe("SM-2 parity with python/Kotlin", () => {
  // [ef, interval, reps, rating, expectedInterval, expectedEf]
  const cases: [number, number, number, number, number, number][] = [
    [2.5, 0, 0, 4, 1, 2.5],
    [2.5, 1, 1, 4, 6, 2.5],
    [2.5, 6, 2, 4, 15, 2.5],
    [2.5, 6, 2, 3, 15, 2.36],
    [2.5, 6, 2, 1, 1, 1.96],
    [1.3, 6, 2, 3, 8, 1.3],
  ];

  test.each(cases)(
    "ef=%p interval=%p reps=%p rating=%p -> interval=%p ef≈%p",
    (ef, interval, reps, rating, expInterval, expEf) => {
      const r = calculate(S(ef, interval, reps), rating);
      expect(r.interval).toBe(expInterval);
      expect(Math.abs(r.easiness - expEf)).toBeLessThan(0.01);
    },
  );

  test("rating < 3 resets repetitions to 0 and interval to 1", () => {
    expect(calculate(S(2.5, 20, 3), 1)).toMatchObject({
      repetitions: 0,
      interval: 1,
    });
    expect(calculate(S(2.5, 10, 5), 2)).toMatchObject({
      repetitions: 0,
      interval: 1,
    });
  });

  test("easiness never drops below 1.3", () => {
    expect(calculate(S(1.3, 6, 2), 1).easiness).toBeGreaterThanOrEqual(1.3);
  });

  test("repetitions increment on success", () => {
    expect(calculate(S(2.5, 6, 2), 4).repetitions).toBe(3);
  });

  test("rating out of 1..5 throws", () => {
    expect(() => calculate(S(2.5, 0, 0), 0)).toThrow();
    expect(() => calculate(S(2.5, 0, 0), 6)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=packages/shared`
Expected: FAIL — cannot find module `./sm2`.

- [ ] **Step 3: Write the implementation** (`packages/shared/src/sm2/sm2.ts`)

```ts
export interface Sm2State {
  easiness: number;
  interval: number;
  repetitions: number;
}

export type Sm2Result = Sm2State;

/**
 * Pure SM-2 calculation. `rating` must be an integer 1–5.
 * Interval is computed from the OLD easiness, before easiness is updated.
 * Ported verbatim from python/flashmd/sm2/algorithm.py (identical in Kotlin).
 */
export function calculate(state: Sm2State, rating: number): Sm2Result {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Rating must be 1-5, got ${rating}`);
  }

  const oldEf = state.easiness;
  const reps = state.repetitions;
  const prevInterval = state.interval;

  let newInterval: number;
  let newReps: number;
  if (rating < 3) {
    newInterval = 1;
    newReps = 0;
  } else {
    if (reps === 0) newInterval = 1;
    else if (reps === 1) newInterval = 6;
    else newInterval = Math.round(prevInterval * oldEf);
    newReps = reps + 1;
  }

  const ef = oldEf + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  const newEf = Math.max(1.3, ef);

  return {
    easiness: Math.round(newEf * 1e6) / 1e6,
    interval: newInterval,
    repetitions: newReps,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=packages/shared`
Expected: PASS — all SM-2 cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/sm2/
git commit -m "feat(shared): port SM-2 algorithm with parity tests"
```

---

### Task 4: Markdown deck parser (port + parity tests)

Ports `python/flashmd/parser/md_parser.py` (identical to `android/.../MdParser.kt`).

**Files:**

- Test: `packages/shared/src/markdown/parser.test.ts`
- Create: `packages/shared/src/markdown/parser.ts`

- [ ] **Step 1: Write the failing parity test** (`packages/shared/src/markdown/parser.test.ts`)

```ts
import { parseDeck } from "./parser";

const SAMPLE = `# Test Deck
*A subtitle line*

---

## Category One

**1. ALPHA — Alpha Particle**
The first letter of the Greek alphabet.
Used in physics to describe helium nuclei.

**2. BETA — Beta Particle**
An electron or positron emitted during beta decay.

## Category Two

**3. GAMMA — Gamma Ray**
High-energy electromagnetic radiation.

This is a second paragraph of the gamma definition.
`;

describe("Markdown deck parser parity with python/Kotlin", () => {
  test("title and source filename", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.title).toBe("Test Deck");
    expect(deck.sourceFilename).toBe("test.md");
  });

  test("card count and fronts", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards.map((c) => c.front)).toEqual([
      "ALPHA — Alpha Particle",
      "BETA — Beta Particle",
      "GAMMA — Gamma Ray",
    ]);
  });

  test("categories carry to following cards", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards.map((c) => c.category)).toEqual([
      "Category One",
      "Category One",
      "Category Two",
    ]);
  });

  test("multi-line single paragraph back joined with space", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards[0].back).toBe(
      "The first letter of the Greek alphabet. Used in physics to describe helium nuclei.",
    );
  });

  test("single line back", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards[1].back).toBe(
      "An electron or positron emitted during beta decay.",
    );
  });

  test("multi-paragraph back split by blank line", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards[2].back.split("\n\n")).toEqual([
      "High-energy electromagnetic radiation.",
      "This is a second paragraph of the gamma definition.",
    ]);
  });

  test("no card patterns -> empty cards", () => {
    const deck = parseDeck(
      "# Empty Deck\nNo card patterns here.\n",
      "empty.md",
    );
    expect(deck.title).toBe("Empty Deck");
    expect(deck.cards).toHaveLength(0);
  });

  test("no title falls back to filename", () => {
    const deck = parseDeck(
      "**1. FOO — Bar**\nSome definition.\n",
      "fallback.md",
    );
    expect(deck.title).toBe("fallback.md");
    expect(deck.cards).toHaveLength(1);
  });

  test("card without a category is null", () => {
    const deck = parseDeck("# Deck\n\n**1. FOO — Bar**\nDefinition.\n", "x.md");
    expect(deck.cards[0].category).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=packages/shared`
Expected: FAIL — cannot find module `./parser`.

- [ ] **Step 3: Write the implementation** (`packages/shared/src/markdown/parser.ts`)

```ts
export interface ParsedCard {
  front: string;
  back: string;
  category: string | null;
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

/**
 * Parse Markdown deck text into a ParsedDeck.
 * Ported verbatim from python/flashmd/parser/md_parser.py (identical in Kotlin).
 * A deck with zero cards is returned as-is; the caller rejects it.
 */
export function parseDeck(text: string, sourceFilename = ""): ParsedDeck {
  const lines = text.split("\n");

  let title = "";
  let currentCategory: string | null = null;
  let currentFront: string | null = null;
  let backLines: string[] = [];
  const cards: ParsedCard[] = [];

  const flush = () => {
    if (currentFront !== null) {
      cards.push({
        front: currentFront,
        back: cleanBack(backLines),
        category: currentCategory,
      });
    }
    currentFront = null;
    backLines = [];
  };

  for (const line of lines) {
    const mH1 = H1.exec(line);
    const mH2 = H2.exec(line);
    const mFront = FRONT.exec(line);

    if (mH1 && !title) {
      title = mH1[1].trim();
    } else if (mH2) {
      flush();
      currentCategory = mH2[1].trim();
    } else if (HR.test(line)) {
      // separator, ignore
    } else if (mFront) {
      flush();
      currentFront = mFront[1].trim();
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=packages/shared`
Expected: PASS — all parser cases green.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/markdown/
git commit -m "feat(shared): port Markdown deck parser with parity tests"
```

---

### Task 5: Public exports + build

**Files:**

- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Re-export the public API** (`packages/shared/src/index.ts`)

```ts
export { calculate } from "./sm2/sm2";
export type { Sm2State, Sm2Result } from "./sm2/sm2";
export { parseDeck } from "./markdown/parser";
export type { ParsedDeck, ParsedCard } from "./markdown/parser";
```

- [ ] **Step 2: Build the package**

Run: `npm run build --workspace=packages/shared`
Expected: PASS — `packages/shared/dist/index.js` + `index.d.ts` emitted, no type errors.

- [ ] **Step 3: Run the full shared test suite once more**

Run: `npm test --workspace=packages/shared`
Expected: PASS — SM-2 + parser suites green.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): export parser + SM-2 public API"
```

---

## Self-Review Notes

- **Spec coverage:** Implements spec §5 (Markdown format) and §6 (SM-2) as the
  shared single-source-of-truth; establishes the §3 monorepo layout (`packages/*`
  - root workspace). Backend/frontend/deploy are deferred to plans 1B/1C/1D.
- **Parity:** SM-2 cases and parser fixtures are copied directly from the existing
  `python/tests/unit/test_sm2.py` and `test_md_parser.py`, so the TS port is locked
  to current behaviour (rating 1–5; interval from old EF; EF floor 1.3; zero-card
  deck allowed at parse time, rejected by the caller).
- **Naming consistency:** `calculate`, `Sm2State`, `parseDeck`, `ParsedDeck`,
  `ParsedCard` are used identically in tests, implementation, and the index export.
