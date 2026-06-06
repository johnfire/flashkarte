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
// Alternative "Q:/A:" card format. `Q:` opens a card (front); the following
// `A:` line becomes the first paragraph of the back, with any further lines as
// additional paragraphs.
const QFRONT = /^Q:\s*(.+)/;
const ABACK = /^A:\s*(.+)/;
// Branching: an anchor line [label], and option lines "- text -> target".
const ANCHOR = /^\[([A-Za-z0-9_-]+)\]\s*$/;
const OPTION = /^-\s+(.+?)\s+->\s+(\S+)\s*$/;

/**
 * Parse Markdown deck text into a ParsedDeck.
 * Ported verbatim from python/flashmd/parser/md_parser.py and mirrored in
 * Kotlin (android .../data/parser/MdParser.kt) — keep all three in sync.
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
