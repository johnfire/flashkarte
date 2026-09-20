import type { Span } from "./lesson-blocks";

/**
 * A short way to write formatted text when authoring a lesson: `**bold**`, `*italic*`, `***both***`
 * and `` `code` `` inside a plain string, instead of a list of span objects.
 *
 * This is an INPUT convenience only. The server turns it into the same spans it always stored, so
 * web and Android never see markup and have no parser to keep in step. Markup is recognised only
 * where it is unambiguous: an opening `*` must not follow a letter or digit and must be followed by
 * a non-space, and a closing `*` must follow a non-space and not be followed by a letter or digit.
 * So `4 * 768` and `2*3 and 4*5` stay plain text. A backslash escapes `*`, `` ` `` and `\`.
 * Nesting is not supported (`**a *b* c**` is bold text containing literal asterisks).
 */

const isLetterOrDigit = (ch: string | undefined): boolean =>
  ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
const isSpaceOrEdge = (ch: string | undefined): boolean =>
  ch === undefined || /\s/.test(ch);

const ESCAPABLE = new Set(["\\", "*", "`"]);
const MAX_MARKER = 3;

const unescape = (text: string): string => text.replace(/\\([\\*`])/g, "$1");
export const escapeMarkup = (text: string): string =>
  text.replace(/[\\*`]/g, "\\$&");

function asteriskRunAt(source: string, index: number): number {
  let end = index;
  while (source[end] === "*") end++;
  return end - index;
}

/** Where the closing run of exactly `length` asterisks starts, or -1. */
function findCloser(source: string, from: number, length: number): number {
  let index = from;
  while (index < source.length) {
    const ch = source[index];
    if (ch === "\\") {
      index += 2;
      continue;
    }
    if (ch === "*") {
      const run = asteriskRunAt(source, index);
      if (
        run === length &&
        !isSpaceOrEdge(source[index - 1]) &&
        !isLetterOrDigit(source[index + length])
      ) {
        return index;
      }
      index += run;
      continue;
    }
    index++;
  }
  return -1;
}

function findCodeCloser(source: string, from: number): number {
  return source.indexOf("`", from);
}

export function parseInlineMarkup(source: string): Span[] {
  const spans: Span[] = [];
  let plain = "";
  const flush = () => {
    if (plain !== "") spans.push({ text: plain });
    plain = "";
  };
  let index = 0;
  while (index < source.length) {
    const ch = source[index];
    if (ch === "\\" && ESCAPABLE.has(source[index + 1] ?? "")) {
      plain += source[index + 1];
      index += 2;
      continue;
    }
    if (ch === "`") {
      const end = findCodeCloser(source, index + 1);
      if (end > index + 1) {
        flush();
        spans.push({ text: source.slice(index + 1, end), code: true });
        index = end + 1;
        continue;
      }
    }
    if (ch === "*") {
      const run = asteriskRunAt(source, index);
      const opens =
        run <= MAX_MARKER &&
        !isLetterOrDigit(source[index - 1]) &&
        !isSpaceOrEdge(source[index + run]);
      if (opens) {
        const end = findCloser(source, index + run, run);
        if (end > index + run) {
          flush();
          spans.push({
            text: unescape(source.slice(index + run, end)),
            ...(run >= 2 && { bold: true }),
            ...(run !== 2 && { italic: true }),
          });
          index = end + run;
          continue;
        }
      }
      plain += "*".repeat(run);
      index += run;
      continue;
    }
    plain += ch;
    index++;
  }
  flush();
  return spans;
}

/**
 * The compact string for these spans, or null when they cannot be written as markup and read back
 * as exactly the same spans (a maths span, code that is also bold, text that begins or ends in a
 * space inside bold or italic, and so on). Callers then keep the span objects.
 */
export function spansToMarkup(spans: Span[]): string | null {
  const parts: string[] = [];
  for (const span of spans) {
    if (span.math || span.text === "") return null;
    if (span.code) {
      if (span.bold || span.italic || span.text.includes("`")) return null;
      parts.push(`\`${span.text}\``);
      continue;
    }
    if (!span.bold && !span.italic) {
      parts.push(escapeMarkup(span.text));
      continue;
    }
    if (/^\s|\s$/.test(span.text)) return null;
    const marker = "*".repeat(span.bold && span.italic ? 3 : span.bold ? 2 : 1);
    parts.push(`${marker}${escapeMarkup(span.text)}${marker}`);
  }
  const markup = parts.join("");
  return JSON.stringify(parseInlineMarkup(markup)) === JSON.stringify(spans)
    ? markup
    : null;
}
