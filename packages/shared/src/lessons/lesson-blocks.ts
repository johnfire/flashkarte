/**
 * A screen (and a question's prompt, options and reasons) is a short list of typed blocks. The
 * server validates them on save, and web and Android each draw every block type natively, so
 * they cannot drift apart the way two markdown renderers would.
 *
 * Paragraph formatting is a list of spans (text plus bold, italic or code flags), not markup
 * inside a string, so there is no parser to keep in step between platforms.
 */

export const BLOCK_TYPES = [
  "paragraph",
  "list",
  "code",
  "image",
  "callout",
  "formula",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const CALLOUT_TONES = ["note", "tip", "warning"] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

export const IMAGE_DISPLAYS = ["inline", "expandable"] as const;
export type ImageDisplay = (typeof IMAGE_DISPLAYS)[number];

export const MAX_BLOCKS_PER_LIST = 20;
export const MAX_LIST_ITEMS = 30;
export const MAX_SPANS = 60;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_CODE_LENGTH = 4000;
export const MAX_LATEX_LENGTH = 2000;
export const MAX_ALT_LENGTH = 300;

export interface Span {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}
export interface ParagraphBlock {
  type: "paragraph";
  spans: Span[];
}
export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: Span[][];
}
export interface CodeBlock {
  type: "code";
  language?: string;
  text: string;
}
export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  display: ImageDisplay;
  caption?: string;
}
export interface CalloutBlock {
  type: "callout";
  tone: CalloutTone;
  spans: Span[];
}
export interface FormulaBlock {
  type: "formula";
  latex: string;
  /** How a screen reader says the formula. Required to finish a lesson, not to save one. */
  spoken?: string;
  /** The rendered SVG asset. The server sets it (and the size) when a screen is saved; an author cannot. */
  assetId?: string;
  /** The rendered size in em, so a client can lay it out before the picture arrives. */
  widthEm?: number;
  heightEm?: number;
  /** How far the picture hangs below the text baseline. */
  depthEm?: number;
}
export type Block =
  | ParagraphBlock
  | ListBlock
  | CodeBlock
  | ImageBlock
  | CalloutBlock
  | FormulaBlock;

export interface BlockIssue {
  path: string;
  message: string;
}

const IMAGE_SOURCE =
  /^(https:\/\/[^\s]+|\/[^\s]+|asset:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

type Reporter = (path: string, message: string) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSpans(
  value: unknown,
  path: string,
  report: Reporter,
): Span[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    report(path, "needs at least one piece of text");
    return null;
  }
  if (value.length > MAX_SPANS) {
    report(path, `has more than ${MAX_SPANS} pieces of text`);
    return null;
  }
  const spans: Span[] = [];
  let hasText = false;
  value.forEach((raw, index) => {
    const at = `${path}[${index}]`;
    if (!isRecord(raw) || typeof raw.text !== "string") {
      report(at, "must be an object with a text string");
      return;
    }
    if (raw.text.length > MAX_TEXT_LENGTH) {
      report(at, `is longer than ${MAX_TEXT_LENGTH} characters`);
      return;
    }
    for (const flag of ["bold", "italic", "code"] as const) {
      if (raw[flag] !== undefined && typeof raw[flag] !== "boolean") {
        report(`${at}.${flag}`, "must be true or false");
      }
    }
    if (raw.text.trim() !== "") hasText = true;
    spans.push({
      text: raw.text,
      ...(raw.bold === true && { bold: true }),
      ...(raw.italic === true && { italic: true }),
      ...(raw.code === true && { code: true }),
    });
  });
  if (!hasText) report(path, "is empty");
  return spans;
}

function validateBlock(
  raw: unknown,
  path: string,
  report: Reporter,
): Block | null {
  if (!isRecord(raw)) {
    report(path, "must be an object");
    return null;
  }
  switch (raw.type) {
    case "paragraph": {
      const spans = validateSpans(raw.spans, `${path}.spans`, report);
      return spans && { type: "paragraph", spans };
    }
    case "callout": {
      const spans = validateSpans(raw.spans, `${path}.spans`, report);
      if (!CALLOUT_TONES.includes(raw.tone as CalloutTone)) {
        report(`${path}.tone`, `must be one of: ${CALLOUT_TONES.join(", ")}`);
        return null;
      }
      return spans && { type: "callout", tone: raw.tone as CalloutTone, spans };
    }
    case "list":
      return validateList(raw, path, report);
    case "code": {
      if (typeof raw.text !== "string" || raw.text.trim() === "") {
        report(`${path}.text`, "is empty");
        return null;
      }
      if (raw.text.length > MAX_CODE_LENGTH) {
        report(`${path}.text`, `is longer than ${MAX_CODE_LENGTH} characters`);
        return null;
      }
      const language =
        typeof raw.language === "string" ? raw.language : undefined;
      return { type: "code", text: raw.text, ...(language && { language }) };
    }
    case "image":
      return validateImage(raw, path, report);
    case "formula":
      return validateFormula(raw, path, report);
    default:
      report(`${path}.type`, `must be one of: ${BLOCK_TYPES.join(", ")}`);
      return null;
  }
}

function validateList(
  raw: Record<string, unknown>,
  path: string,
  report: Reporter,
): Block | null {
  if (typeof raw.ordered !== "boolean") {
    report(`${path}.ordered`, "must be true or false");
    return null;
  }
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    report(`${path}.items`, "needs at least one item");
    return null;
  }
  if (raw.items.length > MAX_LIST_ITEMS) {
    report(`${path}.items`, `has more than ${MAX_LIST_ITEMS} items`);
    return null;
  }
  const items: Span[][] = [];
  raw.items.forEach((item, index) => {
    const spans = validateSpans(item, `${path}.items[${index}]`, report);
    if (spans) items.push(spans);
  });
  return { type: "list", ordered: raw.ordered, items };
}

function validateImage(
  raw: Record<string, unknown>,
  path: string,
  report: Reporter,
): Block | null {
  if (typeof raw.src !== "string" || !IMAGE_SOURCE.test(raw.src)) {
    report(
      `${path}.src`,
      "must be an https:// link, a root-relative path, or asset:<id>",
    );
    return null;
  }
  if (typeof raw.alt !== "string" || raw.alt.trim() === "") {
    report(
      `${path}.alt`,
      "is required: describe the image for a screen reader",
    );
    return null;
  }
  if (raw.alt.length > MAX_ALT_LENGTH) {
    report(`${path}.alt`, `is longer than ${MAX_ALT_LENGTH} characters`);
    return null;
  }
  const display = raw.display ?? "inline";
  if (!IMAGE_DISPLAYS.includes(display as ImageDisplay)) {
    report(`${path}.display`, `must be one of: ${IMAGE_DISPLAYS.join(", ")}`);
    return null;
  }
  const caption =
    typeof raw.caption === "string" && raw.caption.trim() !== ""
      ? raw.caption
      : undefined;
  return {
    type: "image",
    src: raw.src,
    alt: raw.alt,
    display: display as ImageDisplay,
    ...(caption && { caption }),
  };
}

function validateFormula(
  raw: Record<string, unknown>,
  path: string,
  report: Reporter,
): Block | null {
  if (typeof raw.latex !== "string" || raw.latex.trim() === "") {
    report(`${path}.latex`, "is empty");
    return null;
  }
  if (raw.latex.length > MAX_LATEX_LENGTH) {
    report(`${path}.latex`, `is longer than ${MAX_LATEX_LENGTH} characters`);
    return null;
  }
  const spoken =
    typeof raw.spoken === "string" && raw.spoken.trim() !== ""
      ? raw.spoken
      : undefined;
  const assetId = typeof raw.assetId === "string" ? raw.assetId : undefined;
  const size = (value: unknown): number | undefined =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : undefined;
  const [widthEm, heightEm, depthEm] = [
    raw.widthEm,
    raw.heightEm,
    raw.depthEm,
  ].map(size);
  return {
    type: "formula",
    latex: raw.latex,
    ...(spoken && { spoken }),
    ...(assetId && { assetId }),
    ...(widthEm !== undefined && { widthEm }),
    ...(heightEm !== undefined && { heightEm }),
    ...(depthEm !== undefined && { depthEm }),
  };
}

/**
 * Structural validation of a list of blocks. Never throws: every problem comes back with the path
 * that caused it, so an author (or the AI writing through MCP) sees all of them at once.
 */
export function validateBlocks(
  input: unknown,
  path = "blocks",
): { blocks: Block[]; issues: BlockIssue[] } {
  const issues: BlockIssue[] = [];
  const report: Reporter = (at, message) => issues.push({ path: at, message });
  if (!Array.isArray(input) || input.length === 0) {
    report(path, "needs at least one block");
    return { blocks: [], issues };
  }
  if (input.length > MAX_BLOCKS_PER_LIST) {
    report(
      path,
      `has more than ${MAX_BLOCKS_PER_LIST} blocks; one idea per screen is a good rule`,
    );
    return { blocks: [], issues };
  }
  const blocks: Block[] = [];
  input.forEach((raw, index) => {
    const block = validateBlock(raw, `${path}[${index}]`, report);
    if (block) blocks.push(block);
  });
  return { blocks, issues };
}

/** Formulas among these blocks that have no spoken text (a completeness rule, not a structural one). */
export function formulasWithoutSpokenText(blocks: Block[]): FormulaBlock[] {
  return blocks.filter(
    (block): block is FormulaBlock => block.type === "formula" && !block.spoken,
  );
}
