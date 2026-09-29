import { inject } from "./inject";

const TEMPLATE = `<!doctype html><html><head><title>flashkarte</title></head><body><div id="root"></div></body></html>`;

describe("inject", () => {
  it("inserts head HTML before </head>", () => {
    const out = inject(TEMPLATE, { headHtml: '<meta name="x" />' });
    expect(out).toContain('<meta name="x" /></head>');
  });
  it("inserts body HTML inside #root", () => {
    const out = inject(TEMPLATE, { headHtml: "", bodyHtml: "<h1>Hi</h1>" });
    expect(out).toContain('<div id="root"><h1>Hi</h1></div>');
  });
  it("fails safe: returns template unchanged when </head> marker missing", () => {
    const broken = '<html><body><div id="root"></div></body></html>';
    expect(inject(broken, { headHtml: "<meta />" })).toBe(broken);
  });
  it("leaves #root empty when no bodyHtml given", () => {
    const out = inject(TEMPLATE, { headHtml: "<meta />" });
    expect(out).toContain('<div id="root"></div>');
  });
  it("replaces the template's <title> instead of adding a second one", () => {
    const withTitle =
      '<html><head><title>LearnWohl</title></head><body><div id="root"></div></body></html>';
    const out = inject(withTitle, {
      headHtml: "<title>Help — LearnWohl</title>",
    });
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out).toContain("<title>Help — LearnWohl</title>");
    expect(out).not.toContain("<title>LearnWohl</title>");
  });
  it("keeps the template's <title> when the payload carries none", () => {
    const withTitle =
      '<html><head><title>LearnWohl</title></head><body><div id="root"></div></body></html>';
    const out = inject(withTitle, {
      headHtml: '<meta name="robots" content="noindex" />',
    });
    expect(out).toContain("<title>LearnWohl</title>");
  });
  it("copes with a multi-line or attribute-free template title", () => {
    const multi =
      '<html><head>\n  <title>\n    LearnWohl\n  </title>\n</head><body><div id="root"></div></body></html>';
    const out = inject(multi, { headHtml: "<title>Page</title>" });
    expect(out.match(/<title>/g)).toHaveLength(1);
  });
});
