import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The production CSP is `script-src 'self'`, which blocks inline scripts. The
// pre-paint theme restore must therefore be an EXTERNAL same-origin script,
// not inline — otherwise the saved theme silently fails to restore on the live
// site. These guards keep that regression from coming back.
const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

describe("theme restore is CSP-safe", () => {
  test("index.html references the external theme-init script", () => {
    expect(indexHtml).toContain('src="/theme-init.js"');
  });

  test("index.html has no inline script touching localStorage (CSP would block it)", () => {
    const inlineScripts = [
      ...indexHtml.matchAll(
        /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ];
    for (const [, body] of inlineScripts) {
      expect(body).not.toMatch(/localStorage/);
    }
  });
});
