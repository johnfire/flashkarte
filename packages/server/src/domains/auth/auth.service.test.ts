jest.mock("./auth.repository");
import bcrypt from "bcryptjs";
import * as repo from "./auth.repository";
import { updateProfile, login, changePassword } from "./auth.service";
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

describe("changePassword", () => {
  const CURRENT = "CurrentPassw0rd";
  function withHash() {
    return { ...row(), password_hash: bcrypt.hashSync(CURRENT, 4) };
  }

  beforeEach(() => {
    mockRepo.findByIdWithHash.mockResolvedValue(withHash() as never);
    mockRepo.updatePasswordHash.mockResolvedValue(undefined as never);
    mockRepo.deleteRefreshTokensForUser.mockResolvedValue(undefined as never);
    mockRepo.storeRefreshToken.mockResolvedValue(undefined as never);
  });

  test("updates the hash and re-issues a session when the current password matches", async () => {
    const result = await changePassword("u1", CURRENT, "BrandNewPassw0rd");
    expect(mockRepo.updatePasswordHash).toHaveBeenCalledTimes(1);
    // other sessions killed, then a fresh one issued for this device
    expect(mockRepo.deleteRefreshTokensForUser).toHaveBeenCalledWith("u1");
    expect(mockRepo.storeRefreshToken).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBeTruthy();
    expect(result.rawRefresh).toBeTruthy();
  });

  test("rejects a wrong current password without touching the hash", async () => {
    await expect(
      changePassword("u1", "WrongPassword", "BrandNewPassw0rd"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockRepo.updatePasswordHash).not.toHaveBeenCalled();
    expect(mockRepo.deleteRefreshTokensForUser).not.toHaveBeenCalled();
  });

  test("rejects a too-short new password", async () => {
    await expect(
      changePassword("u1", CURRENT, "short"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockRepo.updatePasswordHash).not.toHaveBeenCalled();
  });

  test("rejects reusing the current password as the new one", async () => {
    await expect(
      changePassword("u1", CURRENT, CURRENT),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockRepo.updatePasswordHash).not.toHaveBeenCalled();
  });
});

describe("login account-enumeration resistance (AUTH-004)", () => {
  test("still runs a bcrypt comparison when the email is unknown", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(null as never);
    const spy = jest.spyOn(bcrypt, "compare");
    await expect(
      login("nobody@example.com", "Sup3rSecretPassword123", false),
    ).rejects.toThrow();
    // a dummy compare ran despite no account -> no fast-reject timing oracle
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
