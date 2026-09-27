import { getMcpPublicUrl, getSiteOrigin } from "./siteOrigin";

const originalSiteOrigin = process.env.SITE_ORIGIN;
const originalMcpPublicUrl = process.env.MCP_PUBLIC_URL;

afterEach(() => {
  if (originalSiteOrigin === undefined) delete process.env.SITE_ORIGIN;
  else process.env.SITE_ORIGIN = originalSiteOrigin;

  if (originalMcpPublicUrl === undefined) delete process.env.MCP_PUBLIC_URL;
  else process.env.MCP_PUBLIC_URL = originalMcpPublicUrl;
});

describe("public site URLs", () => {
  it("defaults canonical URLs to LearnWohl", () => {
    delete process.env.SITE_ORIGIN;
    expect(getSiteOrigin()).toBe("https://learnwohl.app");
  });

  it("normalizes an explicitly configured canonical origin", () => {
    process.env.SITE_ORIGIN = "https://staging.learnwohl.app/";
    expect(getSiteOrigin()).toBe("https://staging.learnwohl.app");
  });

  it("advertises MCP only when its public URL is configured", () => {
    delete process.env.MCP_PUBLIC_URL;
    expect(getMcpPublicUrl()).toBeUndefined();

    process.env.MCP_PUBLIC_URL = "  https://mcp.learnwohl.app/mcp  ";
    expect(getMcpPublicUrl()).toBe("https://mcp.learnwohl.app/mcp");
  });
});
