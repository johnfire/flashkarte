import { ValidationError } from "../../utils/errors";
import { renderFormula } from "./formula-renderer";

describe("renderFormula", () => {
  it("draws a formula as a self-contained, colour-neutral SVG with its size", () => {
    const softmax = renderFormula(
      "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
      true,
    );
    expect(softmax.svg.startsWith("<svg")).toBe(true);
    expect(softmax.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(softmax.svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(softmax.svg).toContain("viewBox=");
    expect(softmax.svg).toContain("currentColor");
    // Nothing but the namespace declarations mentions an address.
    expect(softmax.svg.replace(/xmlns(:\w+)?="[^"]*"/g, "")).not.toMatch(
      /<script|onload|https?:\/\/|href/,
    );
    expect(softmax.widthEm).toBeGreaterThan(5);
    expect(softmax.heightEm).toBeGreaterThan(1);
    expect(softmax.depthEm).toBeGreaterThan(0.5);
  });

  it("measures an inline symbol so it can sit on the text baseline", () => {
    const symbol = renderFormula("d_k", false);
    // 2.198ex wide, 1.927ex tall and 0.357ex below the baseline, measured in the slice 0 spike (1 ex = 0.5 em).
    expect(symbol.widthEm).toBeCloseTo(1.099, 2);
    expect(symbol.heightEm).toBeCloseTo(0.964, 2);
    expect(symbol.depthEm).toBeCloseTo(0.179, 2);
  });

  it("a symbol without a descender hangs (almost) nothing below the baseline", () => {
    expect(renderFormula("x", false).depthEm).toBeLessThan(0.05);
    expect(renderFormula("y", false).depthEm).toBeGreaterThan(0.1);
  });

  it("gives the same picture for the same formula", () => {
    expect(renderFormula("R = V/I", true)).toEqual(
      renderFormula("R = V/I", true),
    );
  });

  it("draws a formula in display and inline styles differently", () => {
    const display = renderFormula("\\sum_{i=1}^{n} x_i", true);
    const inline = renderFormula("\\sum_{i=1}^{n} x_i", false);
    expect(display.svg).not.toBe(inline.svg);
  });

  it.each([
    ["an unclosed brace", "\\frac{a"],
    ["an unknown command", "\\notacommand{x}"],
    ["a link", "\\href{javascript:alert(1)}{x}"],
    ["loading extensions", "\\require{color}x"],
    ["raw unicode injection", "\\unicode{x41}"],
    ["injected classes", "\\class{evil}{x}"],
    ["injected styles", "\\style{color:red}{x}"],
  ])("refuses %s, saying what is wrong", (_name, latex) => {
    expect(() => renderFormula(latex, true)).toThrow(ValidationError);
    expect(() => renderFormula(latex, true)).toThrow(/could not be read/);
  });

  it("refuses a runaway macro instead of hanging", () => {
    const start = Date.now();
    expect(() => renderFormula("\\def\\a{\\a\\a}\\a", true)).toThrow(
      ValidationError,
    );
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
