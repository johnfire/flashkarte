import {
  createAuthCode,
  consumeAuthCode,
  createRefreshToken,
  consumeRefreshToken,
} from "./store";

const baseCode = {
  code_challenge: "chal",
  redirect_uri: "https://example.com/cb",
  client_id: "client",
  fk_key: "fk_abc",
};

describe("oauth store", () => {
  test("auth code round-trips once and carries the fk_key", () => {
    const code = createAuthCode(baseCode);
    const entry = consumeAuthCode(code);
    expect(entry?.fk_key).toBe("fk_abc");
    expect(entry?.code_challenge).toBe("chal");
  });

  test("auth code is single-use", () => {
    const code = createAuthCode(baseCode);
    expect(consumeAuthCode(code)).not.toBeNull();
    expect(consumeAuthCode(code)).toBeNull();
  });

  test("unknown auth code returns null", () => {
    expect(consumeAuthCode("nope")).toBeNull();
  });

  test("refresh token round-trips once", () => {
    const token = createRefreshToken("fk_xyz");
    expect(consumeRefreshToken(token)).toEqual({ fk_key: "fk_xyz" });
    expect(consumeRefreshToken(token)).toBeNull();
  });

  test("replaying a rotated token revokes the whole lineage", () => {
    const a = createRefreshToken("fk_lineage");
    expect(consumeRefreshToken(a)).toEqual({ fk_key: "fk_lineage" }); // A -> B
    const b = createRefreshToken("fk_lineage"); // B is the live token
    // Attacker replays the already-consumed A: reuse is detected.
    expect(consumeRefreshToken(a)).toBeNull();
    // ...and the legitimate live token B is revoked too.
    expect(consumeRefreshToken(b)).toBeNull();
  });
});
