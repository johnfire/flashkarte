export interface ParsedOption {
  text: string;
  goto: string;
}

export interface ParsedCard {
  // "basic" cards have front/back and SR state. "branch" cards are play-only
  // (no SR state). A "basic" card MAY additionally carry options when it is a
  // *diagnostic* card (Spec 01): one option targets the reserved CORRECT_TARGET,
  // the rest route to remediation labels. Detect that case with `isDiagnostic()`
  // — the `type` stays "basic" so SR scheduling is unchanged.
  type: "basic" | "branch";
  front: string;
  back: string;
  category: string | null;
  label: string | null;
  options: ParsedOption[];
}

// Reserved option target marking the right answer on a diagnostic card. Shared
// by the parser (classification), server validation, and the study module.
export const CORRECT_TARGET = "correct";

/**
 * A diagnostic card is a `basic` card (front/back + SR state) that also carries
 * multiple-choice options, one of which targets CORRECT_TARGET. Options with no
 * `-> correct` target make the card a `branch` card instead. ("Exactly one
 * correct" is enforced by server validation, which can then reject a two-correct
 * card with a clear message rather than mis-classifying it as a branch card.)
 */
export function isDiagnostic(card: ParsedCard): boolean {
  return (
    card.type === "basic" &&
    card.options.some((option) => option.goto === CORRECT_TARGET)
  );
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
// Alternative "Q:/A:" card format. `Q:` opens a card (front); the following
// `A:` line becomes the first paragraph of the back, with any further lines as
// additional paragraphs.
const QFRONT = /^Q:\s*(.+)/;
const ABACK = /^A:\s*(.+)/;
// Branching: an anchor line [label], and option lines "- text -> target".
const ANCHOR = /^\[([A-Za-z0-9_-]+)\]\s*$/;

// Option line: "- <text> -> <target>". Parsed with linear string ops rather
// than one backtracking regex: the old /^-\s+(.+?)\s+->\s+(\S+)\s*$/ backtracked
// catastrophically (ReDoS) on a long whitespace run, freezing the server's event
// loop for minutes on a single import. The "->" is anchored at end of line, so a
// multi-arrow line keeps the original "target = final token" semantics.
// Keep in sync with python/flashmd/parser/md_parser.py and android MdParser.kt.
function matchOption(line: string): { text: string; goto: string } | null {
  const lead = /^-\s+/.exec(line); // "- " prefix (dash + whitespace)
  if (!lead) return null;
  const tail = /\s->\s+(\S+)\s*$/.exec(line);
  if (!tail) return null;
  // Text is what's between the "- " prefix and the " -> " delimiter. When
  // there's nothing there (e.g. "- -> x"), slice is empty -> not an option,
  // matching the original regex's behavior.
  const text = line.slice(lead[0].length, tail.index).trim();
  if (!text) return null;
  return { text, goto: tail[1] };
}

/**
 * Parse Markdown deck text into a ParsedDeck.
 * Mirrored in Kotlin (android .../data/parser/MdParser.kt) — keep the two in
 * sync. The Python port (python/flashmd/parser/md_parser.py) is FROZEN and
 * implements only the common subset: it has no branching and no diagnostic-card
 * (`-> correct`) classification. Common-subset behavior stays identical across
 * all three (corpus `fixtures/parser-cases.json`); branching/diagnostic parity
 * is TS + Kotlin only.
 * A deck with zero cards is returned as-is; the caller rejects it.
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
      // A card with options is a `branch` card UNLESS one option targets
      // CORRECT_TARGET — then it is a diagnostic card, which keeps its `basic`
      // type, front/back and SR state, carrying the options alongside.
      const diagnostic = options.some((o) => o.goto === CORRECT_TARGET);
      const isBranch = options.length > 0 && !diagnostic;
      cards.push({
        type: isBranch ? "branch" : "basic",
        front: currentFront,
        back: isBranch ? "" : cleanBack(backLines),
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
    const mOption = currentFront !== null ? matchOption(line) : null;

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
      options.push({ text: mOption.text, goto: mOption.goto });
    } else if (
      mA &&
      currentFront !== null &&
      currentIsQA &&
      backLines.every((l) => !l.trim())
    ) {
      // First `A:` after a `Q:`: answer becomes its own paragraph, so any
      // description lines that follow land in a separate paragraph.
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
