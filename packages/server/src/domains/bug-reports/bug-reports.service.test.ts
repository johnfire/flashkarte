import { buildIssueBody } from "./bug-reports.service";
import { createIssue } from "../../github/issues";

describe("buildIssueBody", () => {
  test("includes reporter email and quotes the description", () => {
    const body = buildIssueBody({
      title: "t",
      description: "line one\nline two",
      appVersion: "1.0.0",
      platform: "android",
      device: "Pixel 7",
      userId: "u1",
      email: "a@b.c",
    });
    expect(body).toContain("a@b.c");
    expect(body).toContain("1.0.0");
    expect(body).toContain("> line one");
    expect(body).toContain("> line two");
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
