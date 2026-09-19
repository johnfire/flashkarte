import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { ValidationError } from "../../utils/errors";
import { sanitizeSvg } from "../assets/svg-sanitizer";

/**
 * Turns a formula written in LaTeX into an SVG, once, when a screen is saved. Clients only draw the
 * picture, so web and Android match and neither needs a maths engine.
 *
 * Only the base and AMS commands are loaded. Commands that could load code, link out or inject
 * markup (\require, \href, \unicode, \class, \style) are simply not defined, so they are reported
 * as errors. Fonts are not cached: each SVG is self-contained. The colour is `currentColor`, so
 * whoever draws it chooses the colour (light and dark themes).
 */

/** MathJax measures in ex; the apps size in em. One ex is half an em in MathJax's own fonts. */
const EM_PER_EX = 0.5;
const MAX_MACROS = 1000;
const MAX_BUFFER = 5 * 1024;

export interface RenderedFormula {
  /** A cleaned, self-contained SVG. */
  svg: string;
  widthEm: number;
  heightEm: number;
  /** How far the drawing hangs below the text baseline, so an inline symbol can sit on it. */
  depthEm: number;
}

interface Engine {
  render(latex: string, display: boolean): string;
}

let engine: Engine | null = null;

function createEngine(): Engine {
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const input = new TeX({
    packages: ["base", "ams"],
    maxMacros: MAX_MACROS,
    maxBuffer: MAX_BUFFER,
    // A mistake in the formula is reported to the author, not drawn as a red error box.
    formatError: (_jax: unknown, error: Error) => {
      throw error;
    },
  });
  const output = new SVG({ fontCache: "none" });
  const document = mathjax.document("", { InputJax: input, OutputJax: output });
  return {
    render: (latex, display) =>
      adaptor.innerHTML(document.convert(latex, { display })),
  };
}

const measure = (svg: string, attribute: string): number => {
  const match = new RegExp(`${attribute}="(-?[\\d.]+)ex"`).exec(svg);
  return match ? Number(match[1]) * EM_PER_EX : 0;
};

const round = (value: number): number => Math.round(value * 1000) / 1000;

/** Renders one formula. A formula MathJax cannot read is a ValidationError that names the problem. */
export function renderFormula(
  latex: string,
  display: boolean,
): RenderedFormula {
  engine ??= createEngine();
  let raw: string;
  try {
    raw = engine.render(latex, display);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ValidationError(
      `The formula "${latex.slice(0, 60)}" could not be read: ${message}`,
    );
  }
  const depth = /vertical-align:\s*(-?[\d.]+)ex/.exec(raw);
  return {
    svg: sanitizeSvg(raw).svg,
    widthEm: round(measure(raw, "width")),
    heightEm: round(measure(raw, "height")),
    depthEm: round(depth ? -Number(depth[1]) * EM_PER_EX : 0),
  };
}
