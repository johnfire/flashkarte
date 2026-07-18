import * as repository from "./keys.repository";
import { hasValidApiKeyFormat, resolveKey } from "./keys.service";

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
