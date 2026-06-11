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
});
