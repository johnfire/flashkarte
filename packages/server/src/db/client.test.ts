// AUTH-003: the pool must not connect with a well-known default password in
// production — getPool() fails closed when POSTGRES_PASSWORD is unset.

const SAVED_NODE_ENV = process.env.NODE_ENV;
const SAVED_PW = process.env.POSTGRES_PASSWORD;

afterEach(() => {
  if (SAVED_NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = SAVED_NODE_ENV;
  if (SAVED_PW === undefined) delete process.env.POSTGRES_PASSWORD;
  else process.env.POSTGRES_PASSWORD = SAVED_PW;
  jest.resetModules();
});

function loadClient() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./client") as typeof import("./client");
}

describe("getPool password (AUTH-003)", () => {
  test("throws in production when POSTGRES_PASSWORD is unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.POSTGRES_PASSWORD;
    const { getPool } = loadClient();
    expect(() => getPool()).toThrow(/POSTGRES_PASSWORD/);
  });

  test("uses the provided password in production", () => {
    process.env.NODE_ENV = "production";
    process.env.POSTGRES_PASSWORD = "a-real-password";
    const { getPool, closePool } = loadClient();
    expect(() => getPool()).not.toThrow();
    return closePool();
  });
});
