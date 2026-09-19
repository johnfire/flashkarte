import { slugify } from "../slug";

export interface ParsedOption {
  text: string;
  goto: string;
}

/**
 * A single meaning of a polysemous headword. `context` is the prompt once the word has
 * graduated to independent cards; `hint` is the scaffold shown while it is still chained.
 */
export interface CardSense {
  context: string | null;
  hint: string | null;
  word: string;
  index: number;
  count: number;
}

export interface ParsedCard {
  // "basic" cards have front/back and SR state. "branch" cards are play-only
  // (no SR state). A "basic" card MAY additionally carry options when it is a
  // *diagnostic* card (Spec 01): one option targets the reserved CORRECT_TARGET,
  // the rest route to remediation labels. Detect that case with `isDiagnostic()`
  // — the `type` stays "basic" so SR scheduling is unchanged.
  // "read" cards are lessons: a title (front) and a body (back) that is read and
  // acknowledged, never rated. They carry no SR state and are exposure, not
  // evidence of mastery. Authored with an `@read` tag line above the front.
  type: "basic" | "branch" | "read";
  front: string;
  back: string;
  category: string | null;
  label: string | null;
  options: ParsedOption[];
  // Set when this card is one meaning of a word block; null for ordinary cards.
  sense: CardSense | null;
  // True when a card carries BOTH sense lines and routed options, which is not a
  // meaningful card. The parser keeps today's behaviour (options win, back stays
  // prose) and the server rejects it at upload — see decks validation.
  senseConflict: boolean;
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

export function isReading(card: ParsedCard): boolean {
  return card.type === "read";
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
// Reading card: an `@read` tag line, on its own, above the card's front. The body
// that follows is kept as written (lists, code, blank lines) — unlike a basic
// card's back, which has its single newlines collapsed into spaces.
const READ_TAG = /^@read\s*$/;
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
 * Sense line: "- <gloss> | <context> | <hint>", where only the gloss is required. Split
 * into at most three fields, so any further "|" belongs to the hint.
 *
 * A "- " line that ends in " -> target" is an option, not a sense line; matchOption is
 * tried first, so the two syntaxes cannot be confused.
 */
function matchSenseLine(line: string): RawSense | null {
  const lead = /^-\s+/.exec(line);
  if (!lead) return null;
  const rest = line.slice(lead[0].length);
  if (!rest.includes("|")) return null;
  const parts = rest.split("|");
  const gloss = parts[0].trim();
  if (!gloss) return null; // "- | x" is not a sense line, mirroring matchOption
  const context = (parts[1] ?? "").trim();
  const hint = parts.slice(2).join("|").trim();
  return { gloss, context: context || null, hint: hint || null };
}

interface RawSense {
  gloss: string;
  context: string | null;
  hint: string | null;
}

/**
 * A back is a word block only when EVERY non-blank line is a sense line and there are at
 * least two of them. The strictness is deliberate: a back that merely happens to contain a
 * "- a | b" line keeps parsing exactly as it does today, so existing decks are unaffected.
 * A single sense line is not a block either — a one-meaning word needs none of this.
 */
function detectSenses(lines: string[]): RawSense[] | null {
  const senses: RawSense[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const sense = matchSenseLine(line);
    if (!sense) return null;
    senses.push(sense);
  }
  return senses.length >= 2 ? senses : null;
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
  let currentIsRead = false;
  let pendingRead = false;
  let currentLabel: string | null = null;
  let pendingLabel: string | null = null;
  let backLines: string[] = [];
  let options: ParsedOption[] = [];
  const cards: ParsedCard[] = [];

  const flush = () => {
    if (currentFront !== null && currentIsRead) {
      cards.push({
        type: "read",
        front: currentFront,
        back: cleanReadBody(backLines),
        category: currentCategory,
        label: currentLabel,
        options: [],
        sense: null,
        senseConflict: false,
      });
    } else if (currentFront !== null) {
      // A card with options is a `branch` card UNLESS one option targets
      // CORRECT_TARGET — then it is a diagnostic card, which keeps its `basic`
      // type, front/back and SR state, carrying the options alongside.
      const diagnostic = options.some((o) => o.goto === CORRECT_TARGET);
      const isBranch = options.length > 0 && !diagnostic;
      const senses = detectSenses(backLines);

      if (senses && options.length === 0) {
        // A word block: one card per meaning, sharing the headword as front and
        // laid down contiguously so their positions stay together in the deck.
        const word = slugify(currentFront);
        senses.forEach((sense, index) => {
          cards.push({
            type: "basic",
            front: currentFront as string,
            back: sense.gloss,
            category: currentCategory,
            label: index === 0 ? currentLabel : null,
            options: [],
            sense: {
              context: sense.context,
              hint: sense.hint,
              word,
              index,
              count: senses.length,
            },
            senseConflict: false,
          });
        });
      } else {
        cards.push({
          type: isBranch ? "branch" : "basic",
          front: currentFront,
          back: isBranch ? "" : cleanBack(backLines),
          category: currentCategory,
          label: currentLabel,
          options,
          sense: null,
          senseConflict: senses !== null,
        });
      }
    }
    currentFront = null;
    currentIsRead = false;
    currentLabel = null;
    backLines = [];
    options = [];
  };

  const openCard = (front: string, isQA: boolean) => {
    flush();
    currentFront = front;
    currentIsQA = isQA;
    currentIsRead = pendingRead;
    pendingRead = false;
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
    // A reading body is prose: "- a -> b" inside it is text, not a branch option.
    const mOption =
      currentFront !== null && !currentIsRead ? matchOption(line) : null;

    if (mH1 && !title) {
      title = mH1[1].trim();
    } else if (mAnchor) {
      pendingLabel = mAnchor[1];
    } else if (READ_TAG.test(line)) {
      pendingRead = true;
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

/**
 * A reading body keeps its structure: only leading/trailing blank lines and
 * trailing whitespace are removed. Deliberately not cleanBack, which would
 * flatten lists and code into one paragraph.
 */
function cleanReadBody(lines: string[]): string {
  const buf = lines.map((line) => line.replace(/\s+$/, ""));
  while (buf.length && !buf[0].trim()) buf.shift();
  while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
  return buf.join("\n");
}
