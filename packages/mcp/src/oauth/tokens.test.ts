process.env.MCP_JWT_SECRET = "test-secret";
import { signMcpAccessToken, verifyMcpAccessToken } from "./tokens";

describe("mcp access tokens", () => {
  test("signs and verifies, carrying an opaque session id (not the fk_key)", () => {
    const token = signMcpAccessToken("sess_abc");
    const payload = verifyMcpAccessToken(token);
    expect(payload?.sid).toBe("sess_abc");
    expect(payload?.sub).toBe("mcp-service");
  });

  test("does not leak the fk_ key into the token payload", () => {
    // A signed JWT's payload is base64-readable; the long-lived fk_ key must
    // never travel inside it.
    const token = signMcpAccessToken("sess_abc");
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    expect(JSON.stringify(claims)).not.toContain("fk_");
    expect(claims.fk_key).toBeUndefined();
  });

  test("rejects a garbage token", () => {
    expect(verifyMcpAccessToken("not.a.jwt")).toBeNull();
  });

  test("rejects a token signed with a different secret", () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign({ sub: "mcp-service", sid: "x" }, "wrong", {
      algorithm: "HS256",
    });
    expect(verifyMcpAccessToken(forged)).toBeNull();
  });

  // MCP-005: tokens must be bound to the flashkarte-mcp audience, so a
  // correctly-signed token minted for another audience (or none) is rejected.
  test("rejects a correctly-signed token with a missing/wrong audience", () => {
    const jwt = require("jsonwebtoken");
    const noAud = jwt.sign({ sub: "mcp-service", sid: "x" }, "test-secret", {
      algorithm: "HS256",
    });
    expect(verifyMcpAccessToken(noAud)).toBeNull();
    const wrongAud = jwt.sign({ sub: "mcp-service", sid: "x" }, "test-secret", {
      algorithm: "HS256",
      audience: "some-other-service",
    });
    expect(verifyMcpAccessToken(wrongAud)).toBeNull();
  });
});
