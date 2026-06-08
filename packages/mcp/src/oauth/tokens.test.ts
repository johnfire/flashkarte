process.env.MCP_JWT_SECRET = "test-secret";
import { signMcpAccessToken, verifyMcpAccessToken } from "./tokens";

describe("mcp access tokens", () => {
  test("signs and verifies, carrying the fk_key", () => {
    const token = signMcpAccessToken("fk_secret");
    const payload = verifyMcpAccessToken(token);
    expect(payload?.fk_key).toBe("fk_secret");
    expect(payload?.sub).toBe("mcp-service");
  });

  test("rejects a garbage token", () => {
    expect(verifyMcpAccessToken("not.a.jwt")).toBeNull();
  });

  test("rejects a token signed with a different secret", () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign({ sub: "mcp-service", fk_key: "x" }, "wrong", {
      algorithm: "HS256",
    });
    expect(verifyMcpAccessToken(forged)).toBeNull();
  });
});
