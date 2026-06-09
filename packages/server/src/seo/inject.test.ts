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
});
