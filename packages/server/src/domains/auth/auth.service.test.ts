jest.mock("./auth.repository");
import * as repo from "./auth.repository";
import { updateProfile } from "./auth.service";
import { ValidationError } from "../../utils/errors";
import type { UserRow } from "./auth.repository";

const mockRepo = repo as jest.Mocked<typeof repo>;

function row(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "u1",
    email: "a@b.com",
    role: "user",
    account_type: "free",
    email_verified_at: null,
    display_name: null,
    language: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.updateProfileFields.mockImplementation(
    (_id, _displayName, language) =>
      Promise.resolve(row({ language: language ?? null })),
  );
});

describe("updateProfile language", () => {
  test("persists a supported language and returns it on the DTO", async () => {
    const user = await updateProfile("u1", undefined, "de");
    expect(mockRepo.updateProfileFields).toHaveBeenCalledWith("u1", null, "de");
    expect(user.language).toBe("de");
  });

  test("rejects an unsupported language with a ValidationError", async () => {
    await expect(updateProfile("u1", undefined, "xx")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mockRepo.updateProfileFields).not.toHaveBeenCalled();
  });

  test("leaves language untouched when not provided", async () => {
    const user = await updateProfile("u1", "Alice");
    expect(mockRepo.updateProfileFields).toHaveBeenCalledWith(
      "u1",
      "Alice",
      undefined,
    );
    expect(user.language).toBeNull();
  });
});
