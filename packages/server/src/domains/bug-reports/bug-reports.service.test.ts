import { buildIssueBody } from "./bug-reports.service";
import { createIssue } from "../../github/issues";

describe("buildIssueBody", () => {
  test("includes a pseudonymous reporter ID and renders the description as inert fenced text", () => {
    const body = buildIssueBody({
      title: "t",
      description: "line one\nline two",
      appVersion: "1.0.0",
      platform: "android",
      userId: "u1",
    });
    expect(body).toContain("Reporter account ID:** `u1`");
    expect(body).not.toContain("Device:");
    expect(body).toContain("1.0.0");
    expect(body).toContain("```\nline one\nline two\n```");
  });

  // DATA-002: a blockquote does not neutralize fenced blocks or image markup.
  test("fence outlasts inner backticks so markdown/image injection stays literal", () => {
    const description = "![pwn](http://attacker.test/x)\n```\nbreak\n```";
    const body = buildIssueBody({
      title: "t",
      description,
      userId: "u1",
    });
    // content's longest backtick run is 3, so the wrapper fence is 4 ticks and
    // the inner ``` cannot close it early.
    expect(body).toContain("````\n" + description + "\n````");
  });
});

describe("createIssue (no token)", () => {
  const original = process.env.GITHUB_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original;
  });

  test("returns {url:null} and does not throw when GITHUB_TOKEN unset", async () => {
    delete process.env.GITHUB_TOKEN;
    const res = await createIssue({ title: "t", body: "b", labels: ["bug"] });
    expect(res).toEqual({ url: null });
  });
});
