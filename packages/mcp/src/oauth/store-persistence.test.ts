import fs from "fs";
import os from "os";
import path from "path";

// Regression: deploys restart the container; without persistence every
// connector (claude.ai etc.) had to re-authenticate after each push.

const STORE = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "fk-oauth-")),
  "store.json",
);

function freshStore() {
  jest.resetModules();
  process.env.MCP_STORE_PATH = STORE;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./store") as typeof import("./store");
}

afterEach(() => {
  delete process.env.MCP_STORE_PATH;
  delete process.env.MCP_JWT_SECRET;
});

describe("oauth store persistence", () => {
  it("refresh tokens survive a restart", async () => {
    const a = freshStore();
    const token = a.createRefreshToken("fk_user1");
    await new Promise((r) => setTimeout(r, 250)); // debounced write flushes

    const b = freshStore(); // simulated restart: new module, same file
    expect(b.consumeRefreshToken(token)).toEqual({ fk_key: "fk_user1" });
  });

  it("consumed tokens stay consumed across restarts", async () => {
    const a = freshStore();
    const token = a.createRefreshToken("fk_user2");
    expect(a.consumeRefreshToken(token)).not.toBeNull();
    await new Promise((r) => setTimeout(r, 250));

    const b = freshStore();
    expect(b.consumeRefreshToken(token)).toBeNull();
  });

  it("corrupt store file starts empty instead of crashing", () => {
    fs.writeFileSync(STORE, "{not json");
    const a = freshStore();
    const token = a.createRefreshToken("fk_user3");
    expect(a.consumeRefreshToken(token)).toEqual({ fk_key: "fk_user3" });
  });

  it("encrypts fk_ keys at rest when MCP_JWT_SECRET is set", async () => {
    process.env.MCP_JWT_SECRET = "store-encryption-secret";
    const a = freshStore();
    const token = a.createRefreshToken("fk_topsecret");
    await new Promise((r) => setTimeout(r, 250));

    const onDisk = fs.readFileSync(STORE, "utf8");
    expect(onDisk).not.toContain("fk_topsecret"); // not cleartext on disk

    const b = freshStore(); // restart: must still decrypt + round-trip
    expect(b.consumeRefreshToken(token)).toEqual({ fk_key: "fk_topsecret" });
  });

  it("still loads a legacy plaintext store (no re-auth on the encryption rollout)", () => {
    const legacy = {
      refreshTokens: [
        ["legacytok", { fk_key: "fk_legacy", expires_at: Date.now() + 1e9 }],
      ],
      consumedTokens: [],
    };
    fs.writeFileSync(STORE, JSON.stringify(legacy));
    process.env.MCP_JWT_SECRET = "store-encryption-secret";
    const a = freshStore();
    expect(a.consumeRefreshToken("legacytok")).toEqual({ fk_key: "fk_legacy" });
  });
});
