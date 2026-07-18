import * as repository from "./keys.repository";
import {
  createKey,
  hasValidApiKeyFormat,
  resolveKey,
  revokeKey,
} from "./keys.service";

jest.mock("./keys.repository");

const mockedRepository = repository as jest.Mocked<typeof repository>;
const VALID_API_KEY = `fk_${"a".repeat(64)}`;

beforeEach(() => jest.clearAllMocks());

describe("hasValidApiKeyFormat", () => {
  test("accepts the generated API-key shape", () => {
    expect(hasValidApiKeyFormat(VALID_API_KEY)).toBe(true);
  });

  test.each([
    "fk_too-short",
    `fk_${"A".repeat(64)}`,
    `fk_${"g".repeat(64)}`,
    "not-an-api-key",
  ])("rejects malformed key %s", (rawKey) => {
    expect(hasValidApiKeyFormat(rawKey)).toBe(false);
  });
});

describe("resolveKey", () => {
  test("rejects malformed keys without querying the database", async () => {
    await expect(resolveKey("fk_invalid")).resolves.toBeNull();
    expect(mockedRepository.findUserByKeyHash).not.toHaveBeenCalled();
  });

  test("resolves a well-formed key", async () => {
    mockedRepository.findUserByKeyHash.mockResolvedValue({
      user_id: "user-123",
      scope: "deck",
      key_prefix: "fk_aaaaaaaaa",
    });

    await expect(resolveKey(VALID_API_KEY)).resolves.toEqual({
      userId: "user-123",
      scope: "deck",
      keyPrefix: "fk_aaaaaaaaa",
    });
    expect(mockedRepository.findUserByKeyHash).toHaveBeenCalledTimes(1);
  });
});

describe("key command validation", () => {
  test("rejects an invalid scope before inserting", async () => {
    await expect(createKey("user-1", "MCP", "invalid")).rejects.toThrow(
      "invalid key scope",
    );
    expect(mockedRepository.insertApiKey).not.toHaveBeenCalled();
  });

  test("defaults a blank name and truncates long names", async () => {
    mockedRepository.insertApiKey.mockResolvedValue({
      name: "MCP",
      key_prefix: "fk_aaaaaaaaa",
      created_at: "2026-01-01",
    });

    await createKey("user-1", "   ");
    expect(mockedRepository.insertApiKey).toHaveBeenLastCalledWith(
      expect.any(String),
      "user-1",
      "MCP",
      expect.any(String),
      "full",
    );

    await createKey("user-1", "a".repeat(80));
    expect(mockedRepository.insertApiKey.mock.calls[1][2]).toHaveLength(50);
  });

  test("rejects a blank prefix before deleting", async () => {
    await expect(revokeKey("user-1", "   ")).rejects.toThrow(
      "key prefix is required",
    );
    expect(mockedRepository.deleteApiKey).not.toHaveBeenCalled();
  });
});
