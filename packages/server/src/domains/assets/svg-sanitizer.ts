import { SaxesParser } from "saxes";
import { ValidationError } from "../../utils/errors";

/**
 * Cleans an SVG an author (usually an AI) wrote, so it can be stored and shown to learners. It is
 * an allowlist: only known drawing elements and attributes survive, everything else (scripts,
 * event handlers, external references, embedded HTML, CSS that can fetch things) is removed and
 * reported back, so the author sees what was dropped. Input that is not well-formed SVG is refused
 * rather than repaired.
 *
 * This is one of several layers. Clients show the result as an image, where scripts and outside
 * requests never run, and the server serves it with a sandboxing content security policy.
 */

export const MAX_SVG_CHARS = 200_000;
const MAX_ELEMENTS = 5_000;
const MAX_DEPTH = 40;
const MAX_ATTRIBUTE_CHARS = 60_000;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

const ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "marker",
  "pattern",
  "use",
  "symbol",
]);
/** Elements whose text content is kept (labels and accessible names). */
const TEXT_ELEMENTS = new Set(["text", "tspan", "title", "desc"]);

const ATTRIBUTES = new Set([
  "id",
  "class",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fx",
  "fy",
  "d",
  "points",
  "transform",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-miterlimit",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "clip-rule",
  "clip-path",
  "mask",
  "marker-start",
  "marker-mid",
  "marker-end",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "dx",
  "dy",
  "letter-spacing",
  "textLength",
  "lengthAdjust",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "orient",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
  "preserveAspectRatio",
  "version",
  "role",
  "aria-label",
  "aria-hidden",
  "aria-labelledby",
  "aria-describedby",
  "visibility",
  "paint-order",
  "vector-effect",
  "shape-rendering",
  "text-rendering",
]);

const STYLE_PROPERTIES = new Set([
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "stop-color",
  "stop-opacity",
  "paint-order",
  "visibility",
  "marker-start",
  "marker-mid",
  "marker-end",
]);

/** Plain values only: letters, digits, and the punctuation numbers, colours and lists use. */
const SAFE_VALUE = /^[\w\s#.,%()\-+'"/:]*$/;
const LOCAL_URL = /^url\(\s*#[\w.-]+\s*\)$/;
const LOCAL_REFERENCE = /^#[\w.-]+$/;
const VIEW_BOX = /^\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*$/;

export interface SanitizedSvg {
  svg: string;
  /** What was dropped, for the author: each entry once. */
  removed: string[];
}

const escapeText = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttribute = (text: string): string =>
  escapeText(text).replace(/"/g, "&quot;");

/** A value with a `url(...)` is allowed only as a reference to something in the same file. */
function isSafeValue(value: string): boolean {
  if (value.length > MAX_ATTRIBUTE_CHARS) return false;
  if (/javascript:|vbscript:|data:|expression\s*\(|@import|<|>/i.test(value))
    return false;
  const urls = value.match(/url\([^)]*\)/gi) ?? [];
  if (urls.some((reference) => !LOCAL_URL.test(reference))) return false;
  return true;
}

function cleanStyle(value: string): string | null {
  const kept: string[] = [];
  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const setting = declaration.slice(separator + 1).trim();
    if (
      STYLE_PROPERTIES.has(property) &&
      SAFE_VALUE.test(setting) &&
      isSafeValue(setting)
    ) {
      kept.push(`${property}:${setting}`);
    }
  }
  return kept.length > 0 ? kept.join(";") : null;
}

/** The cleaned value for an attribute, or null when it must be dropped. */
function cleanAttribute(name: string, value: string): string | null {
  if (name === "href" || name === "xlink:href") {
    return LOCAL_REFERENCE.test(value.trim()) ? value.trim() : null;
  }
  if (name === "style") return cleanStyle(value);
  if (!ATTRIBUTES.has(name)) return null;
  return isSafeValue(value) ? value : null;
}

function refuse(reason: string): never {
  throw new ValidationError(`The SVG cannot be used: ${reason}`);
}

interface Frame {
  name: string;
  skipped: boolean;
}

function checkRoot(attributes: Record<string, string>): void {
  if (attributes.xmlns !== SVG_NAMESPACE) {
    refuse(`the root <svg> needs xmlns="${SVG_NAMESPACE}"`);
  }
  const box = VIEW_BOX.exec(attributes.viewBox ?? "");
  if (!box || Number(box[1]) <= 0 || Number(box[2]) <= 0) {
    refuse('the root <svg> needs a viewBox such as viewBox="0 0 400 300"');
  }
}

export function sanitizeSvg(input: string): SanitizedSvg {
  if (typeof input !== "string" || input.trim() === "") refuse("it is empty");
  if (input.length > MAX_SVG_CHARS) {
    refuse(`it is larger than ${MAX_SVG_CHARS / 1000} KB`);
  }
  const parser = new SaxesParser({ xmlns: false, fragment: false });
  const removed = new Set<string>();
  const stack: Frame[] = [];
  const output: string[] = [];
  let elements = 0;
  let sawRoot = false;

  parser.on("error", (error) =>
    refuse(`it is not well-formed (${error.message.split("\n")[0]})`),
  );
  parser.on("doctype", () =>
    refuse("a DOCTYPE (and with it entities) is not allowed"),
  );
  parser.on("processinginstruction", () =>
    removed.add("processing instructions"),
  );
  parser.on("comment", () => undefined);

  parser.on("opentag", (tag) => {
    const attributes = tag.attributes as Record<string, string>;
    const parent = stack[stack.length - 1];
    const skipped = parent?.skipped ?? false;
    elements += 1;
    if (elements > MAX_ELEMENTS)
      refuse(`it has more than ${MAX_ELEMENTS} elements`);
    if (stack.length >= MAX_DEPTH)
      refuse(`it is nested deeper than ${MAX_DEPTH} levels`);
    if (!sawRoot) {
      sawRoot = true;
      if (tag.name !== "svg") refuse("the root element must be <svg>");
      checkRoot(attributes);
    }
    const allowed = !skipped && ELEMENTS.has(tag.name);
    if (!allowed) {
      if (!skipped) removed.add(`<${tag.name}>`);
      stack.push({ name: tag.name, skipped: true });
      return;
    }
    const kept: string[] = [];
    for (const [name, value] of Object.entries(attributes)) {
      if (tag.name === "svg" && name === "xmlns") {
        kept.push(`xmlns="${SVG_NAMESPACE}"`);
        continue;
      }
      if (name === "xmlns:xlink") continue; // added below, so a standalone file is always well-formed
      const cleaned = cleanAttribute(name, value);
      if (cleaned === null) removed.add(`${name} attribute`);
      else kept.push(`${name}="${escapeAttribute(cleaned)}"`);
    }
    if (tag.name === "use" && !kept.some((a) => /^(xlink:)?href=/.test(a))) {
      removed.add("<use> without a local reference");
      stack.push({ name: tag.name, skipped: true });
      return;
    }
    // Whatever is used, a standalone SVG needs the xlink prefix declared or a browser refuses it.
    if (tag.name === "svg") kept.push(`xmlns:xlink="${XLINK_NAMESPACE}"`);
    output.push(
      `<${tag.name}${kept.length > 0 ? " " + kept.join(" ") : ""}${tag.isSelfClosing ? "/" : ""}>`,
    );
    stack.push({ name: tag.name, skipped: false });
  });

  parser.on("closetag", (tag) => {
    const frame = stack.pop();
    if (frame && !frame.skipped && !tag.isSelfClosing)
      output.push(`</${frame.name}>`);
  });

  const keepText = (text: string) => {
    const frame = stack[stack.length - 1];
    if (frame && !frame.skipped && TEXT_ELEMENTS.has(frame.name))
      output.push(escapeText(text));
  };
  parser.on("text", keepText);
  parser.on("cdata", keepText);

  parser.write(input).close();
  if (!sawRoot) refuse("it has no <svg> element");
  return { svg: output.join(""), removed: [...removed] };
}
