import { ValidationError } from "../../utils/errors";
import { MAX_SVG_CHARS, sanitizeSvg } from "./svg-sanitizer";

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const wrap = (inner: string, attributes = `${NS} viewBox="0 0 100 50"`) =>
  `<svg ${attributes}>${inner}</svg>`;

describe("sanitizeSvg: what a good diagram keeps", () => {
  it("keeps drawing elements, labels and presentation attributes unchanged", () => {
    const source = wrap(
      '<title>A box</title><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>' +
        '<rect x="1" y="2" width="30" height="20" rx="3" fill="url(#g)" stroke="#333" stroke-width="2"/>' +
        '<path d="M0 0 L10 10" fill="none"/><circle cx="5" cy="5" r="2"/>' +
        '<text x="4" y="9" font-size="8" text-anchor="middle">R &amp; C <tspan font-weight="bold">1 &lt; 2</tspan></text>',
    );
    const result = sanitizeSvg(source);
    expect(result.removed).toEqual([]);
    expect(result.svg).toContain(
      '<rect x="1" y="2" width="30" height="20" rx="3" fill="url(#g)"',
    );
    expect(result.svg).toContain("<text ");
    expect(result.svg).toContain("R &amp; C ");
    expect(result.svg).toContain("1 &lt; 2");
    expect(result.svg).toContain('viewBox="0 0 100 50"');
  });

  it("keeps a local <use> reference and a filtered style attribute", () => {
    const result = sanitizeSvg(
      wrap(
        '<defs><g id="a"><circle r="1"/></g></defs><use href="#a" x="3"/><rect style="fill:#f00; stroke-width:2; position:fixed"/>',
      ),
    );
    expect(result.svg).toContain('<use href="#a" x="3"/>');
    expect(result.svg).toContain('style="fill:#f00;stroke-width:2"');
  });

  it("is idempotent: cleaning clean output changes nothing", () => {
    const once = sanitizeSvg(
      wrap('<rect width="5" height="5" fill="#123"/>'),
    ).svg;
    expect(sanitizeSvg(once)).toEqual({ svg: once, removed: [] });
  });
});

describe("sanitizeSvg: what is removed, and reported", () => {
  const cleaned = (inner: string) => sanitizeSvg(wrap(inner));

  it("removes scripts, with everything inside them", () => {
    const result = cleaned(
      '<script>alert(1)</script><rect width="1" height="1"/>',
    );
    expect(result.svg).not.toContain("script");
    expect(result.svg).not.toContain("alert");
    expect(result.svg).toContain("<rect");
    expect(result.removed).toContain("<script>");
  });

  it.each([
    ['<rect onclick="alert(1)" width="1"/>', "onclick"],
    ['<svg onload="alert(1)" />', "onload"],
    ['<rect onmouseover="x" width="1"/>', "onmouseover"],
  ])("removes event handler attributes: %s", (inner, handler) => {
    const result = cleaned(inner);
    expect(result.svg).not.toContain(handler);
    expect(result.removed.join(" ")).toContain(handler);
  });

  it("removes embedded HTML, foreign objects, images, iframes, styles and animation", () => {
    const result = cleaned(
      '<foreignObject><div>hi</div></foreignObject><image href="https://evil.example/x.png"/>' +
        '<iframe src="x"/><style>@import url(https://evil.example/a.css);</style>' +
        '<animate attributeName="href" values="javascript:alert(1)"/><set attributeName="onclick" to="alert(1)"/>',
    );
    for (const gone of [
      "foreignObject",
      "<div",
      "<image",
      "iframe",
      "<style",
      "animate",
      "<set",
      "evil.example",
    ]) {
      expect(result.svg).not.toContain(gone);
    }
    expect(result.removed).toEqual(
      expect.arrayContaining([
        "<foreignObject>",
        "<image>",
        "<iframe>",
        "<style>",
        "<animate>",
        "<set>",
      ]),
    );
  });

  it("removes links that leave the file", () => {
    const result = cleaned(
      '<use href="https://evil.example/a.svg#x"/><use xlink:href="data:image/svg+xml;base64,AAAA"/>' +
        '<a href="javascript:alert(1)"><rect width="1" height="1"/></a><rect width="1" fill="url(https://evil.example/p)"/>',
    );
    expect(result.svg).not.toContain("evil.example");
    expect(result.svg).not.toContain("javascript");
    expect(result.svg).not.toContain("data:");
    expect(result.svg).not.toContain("<a ");
  });

  it("removes style declarations that can fetch or break out", () => {
    const result = cleaned(
      '<rect style="fill:url(https://evil.example/x); background:url(x); fill:#0f0; stroke:red}"/>',
    );
    expect(result.svg).not.toContain("evil.example");
    expect(result.svg).not.toContain("background");
    expect(result.svg).toContain("fill:#0f0");
  });

  it("drops comments and processing instructions", () => {
    const result = sanitizeSvg(
      `<?xml version="1.0"?><?xml-stylesheet href="x.css"?>${wrap("<!-- <script> --><rect/>")}`,
    );
    expect(result.svg).not.toContain("<!--");
    expect(result.svg).not.toContain("stylesheet");
  });

  it("keeps text as text: markup in a label cannot become elements", () => {
    const result = cleaned(
      "<text><![CDATA[<script>alert(1)</script>]]></text>",
    );
    expect(result.svg).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.svg).not.toMatch(/<script/);
  });

  it("escapes quotes in attribute values, so a value cannot become a new attribute", () => {
    const result = cleaned(
      '<text font-family="a&quot; onload=&quot;x">t</text>',
    );
    // The whole thing stays inside one quoted value.
    expect(result.svg).toContain('font-family="a&quot; onload=&quot;x"');
    expect(result.svg).not.toMatch(/ onload="/);
  });

  it("ignores text outside labels", () => {
    expect(cleaned("stray words<rect/>").svg).not.toContain("stray");
  });
});

describe("sanitizeSvg: what is refused", () => {
  const refused = (input: string, message: RegExp) => {
    expect(() => sanitizeSvg(input)).toThrow(ValidationError);
    expect(() => sanitizeSvg(input)).toThrow(message);
  };

  it("refuses empty, malformed and non-SVG input", () => {
    refused("", /empty/);
    refused("<svg", /not well-formed/);
    refused(`<svg ${NS} viewBox="0 0 1 1"><rect></svg>`, /not well-formed/);
    refused(
      '<html xmlns="http://www.w3.org/1999/xhtml"></html>',
      /root element must be <svg>/,
    );
    refused("just text", /not well-formed|no <svg>/);
  });

  it("refuses a DOCTYPE, so no entities can be defined", () => {
    refused(
      `<!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;">]>${wrap("<text>&b;</text>")}`,
      /DOCTYPE/,
    );
  });

  it("needs the SVG namespace and a usable viewBox", () => {
    refused('<svg viewBox="0 0 10 10"></svg>', /xmlns/);
    refused(`<svg ${NS}></svg>`, /viewBox/);
    refused(`<svg ${NS} viewBox="0 0 0 0"></svg>`, /viewBox/);
    refused(`<svg ${NS} viewBox="wide"></svg>`, /viewBox/);
  });

  it("refuses very large, very deep and very busy files", () => {
    refused(wrap(`<text>${"a".repeat(MAX_SVG_CHARS)}</text>`), /larger than/);
    refused(wrap("<g>".repeat(60) + "</g>".repeat(60)), /nested deeper/);
    refused(wrap("<rect/>".repeat(5_100)), /more than 5000 elements/);
  });
});
