jest.mock("../../db/client");
jest.mock("../audit/audit.service");
jest.mock("./auth.repository");
jest.mock("../account/twoFactor.service");
jest.mock("bcryptjs");
jest.mock("../../email/mailer");

import bcrypt from "bcryptjs";
import { withTransaction } from "../../db/client";
import {
  getAppUrl,
  sendEmailChangeVerification,
  sendPasswordResetEmail,
} from "../../email/mailer";
import { record, userActor } from "../audit/audit.service";
import * as twoFactor from "../account/twoFactor.service";
import * as repo from "./auth.repository";
import {
  deleteAccount,
  login,
  completeTwoFactorLogin,
  changePassword,
  forgotPassword,
  resetPassword,
  requestEmailChange,
  confirmEmailChange,
  updateProfile,
  verifyEmail,
} from "./auth.service";

const mockTwoFactor = twoFactor as jest.Mocked<typeof twoFactor>;

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockAudit = { record, userActor } as {
  record: jest.MockedFunction<typeof record>;
  userActor: jest.MockedFunction<typeof userActor>;
};
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockGetAppUrl = getAppUrl as jest.MockedFunction<typeof getAppUrl>;
const mockSendPasswordResetEmail =
  sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>;
const mockSendEmailChangeVerification =
  sendEmailChangeVerification as jest.MockedFunction<
    typeof sendEmailChangeVerification
  >;

function setupRepoRow(
  overrides: Partial<{
    id: string;
    email: string;
    password_hash: string;
  }> = {},
) {
  const row = {
    id: overrides.id ?? "u1",
    email: overrides.email ?? "a@b.com",
    role: "user",
    account_type: "free",
    email_verified_at: null,
    display_name: null,
    language: null,
    two_factor_enabled: false,
    password_hash: overrides.password_hash ?? "$2a$12$hashhashhash",
  };
  mockRepo.findByIdWithHash.mockResolvedValue(row);
  return row;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAudit.userActor.mockReturnValue({ type: "user", id: "u1" });
  mockBcrypt.compare.mockResolvedValue(true as never);
  mockAudit.record.mockResolvedValue(undefined);
  mockGetAppUrl.mockReturnValue("https://flashkarte.example");
  mockRepo.deleteUserAccount.mockResolvedValue(undefined);
  // withTransaction calls the callback with a mock client
  const mockClient = { query: jest.fn() } as unknown as import("pg").PoolClient;
  (withTransaction as jest.Mock).mockImplementation(
    async (fn: (client: unknown) => Promise<void>) => fn(mockClient),
  );
});

describe("forgotPassword", () => {
  it("returns without waiting for SMTP delivery", async () => {
    const user = setupRepoRow();
    mockRepo.findByEmailWithHash.mockResolvedValue(user);
    mockRepo.deletePasswordResetTokensForUser.mockResolvedValue([]);
    mockRepo.insertPasswordResetToken.mockResolvedValue([]);

    let finishSending: (() => void) | undefined;
    const pendingDelivery = new Promise<void>((resolve) => {
      finishSending = resolve;
    });
    mockSendPasswordResetEmail.mockReturnValue(pendingDelivery);

    await expect(forgotPassword("A@B.COM")).resolves.toBeUndefined();
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      "a@b.com",
      expect.stringMatching(
        /^https:\/\/flashkarte\.example\/reset-password\?token=/,
      ),
    );

    finishSending?.();
    await pendingDelivery;
  });

  it("does not create a reset token for an unknown email", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(null);

    await expect(
      forgotPassword("missing@example.com"),
    ).resolves.toBeUndefined();

    expect(mockRepo.insertPasswordResetToken).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("silently ignores a non-string email", async () => {
    await expect(forgotPassword(42)).resolves.toBeUndefined();
    expect(mockRepo.findByEmailWithHash).not.toHaveBeenCalled();
  });
});

describe("auth command validation", () => {
  it.each([undefined, 42, ""])(
    "rejects missing verification token %p before querying",
    async (token) => {
      await expect(verifyEmail(token)).rejects.toThrow(
        "Verification token is required",
      );
      expect(mockRepo.findVerificationToken).not.toHaveBeenCalled();
    },
  );

  it("normalizes a valid profile update", async () => {
    const user = setupRepoRow();
    mockRepo.updateProfileFields.mockResolvedValue(user);

    await updateProfile("u1", "  Ada  ", "de");

    expect(mockRepo.updateProfileFields).toHaveBeenCalledWith(
      "u1",
      "Ada",
      "de",
    );
  });

  it.each([
    [42, undefined, "Display name must be text"],
    ["a".repeat(61), undefined, "Display name must be 60 characters or fewer"],
    ["Ada", "it", "Unsupported language"],
  ])(
    "rejects invalid profile fields",
    async (displayName, language, message) => {
      await expect(updateProfile("u1", displayName, language)).rejects.toThrow(
        message,
      );
      expect(mockRepo.updateProfileFields).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing current password before comparing", async () => {
    setupRepoRow();

    await expect(
      changePassword("u1", undefined, "new-password"),
    ).rejects.toThrow("Current password is required");
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it.each([undefined, 42, ""])(
    "rejects missing reset token %p before querying",
    async (token) => {
      await expect(resetPassword(token, "new-password")).rejects.toThrow(
        "Reset token is required",
      );
      expect(mockRepo.findPasswordResetToken).not.toHaveBeenCalled();
    },
  );

  it("keeps malformed two-factor challenges as authentication errors", async () => {
    await expect(
      completeTwoFactorLogin(42, "123456", false),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      httpStatus: 401,
    });
  });
});

describe("verified email changes", () => {
  it("requires the current password before sending a change link", async () => {
    setupRepoRow();
    mockBcrypt.compare.mockResolvedValue(false as never);

    await expect(
      requestEmailChange("u1", "wrong", "new@example.com"),
    ).rejects.toThrow("Current password is incorrect");
    expect(mockRepo.insertEmailChangeToken).not.toHaveBeenCalled();
  });

  it("stores only a hashed token and emails the new address", async () => {
    setupRepoRow();
    mockRepo.findByEmailWithHash.mockResolvedValue(null);
    mockRepo.deleteEmailChangeTokensForUser.mockResolvedValue([]);
    mockRepo.insertEmailChangeToken.mockResolvedValue([]);
    mockSendEmailChangeVerification.mockResolvedValue(undefined);

    await requestEmailChange("u1", "password", "NEW@example.com");

    expect(mockRepo.insertEmailChangeToken).toHaveBeenCalledWith(
      "u1",
      "new@example.com",
      expect.stringMatching(/^[0-9a-f]{64}$/),
      expect.any(Date),
    );
    expect(mockSendEmailChangeVerification).toHaveBeenCalledWith(
      "new@example.com",
      expect.stringMatching(
        /^https:\/\/flashkarte\.example\/verify-email\?changeToken=/,
      ),
    );
  });

  it("changes the email once, then invalidates every session", async () => {
    mockRepo.findEmailChangeToken.mockResolvedValue({
      user_id: "u1",
      new_email: "new@example.com",
      expires_at: new Date(Date.now() + 60_000),
    });
    mockRepo.updateEmail.mockResolvedValue(
      setupRepoRow({
        email: "new@example.com",
      }),
    );
    mockRepo.deleteEmailChangeTokensForUser.mockResolvedValue([]);
    mockRepo.deleteRefreshTokensForUser.mockResolvedValue([]);

    await expect(confirmEmailChange("link-token")).resolves.toBe("u1");
    expect(mockRepo.updateEmail).toHaveBeenCalledWith("u1", "new@example.com");
    expect(mockRepo.deleteRefreshTokensForUser).toHaveBeenCalledWith("u1");
  });

  it("rejects an expired email-change link", async () => {
    mockRepo.findEmailChangeToken.mockResolvedValue({
      user_id: "u1",
      new_email: "new@example.com",
      expires_at: new Date(Date.now() - 60_000),
    });

    await expect(confirmEmailChange("expired-token")).rejects.toThrow(
      "This email-change link is invalid or expired",
    );
    expect(mockRepo.updateEmail).not.toHaveBeenCalled();
  });
});

describe("deleteAccount", () => {
  it("rejects when current password is missing", async () => {
    setupRepoRow();
    await expect(deleteAccount("u1", undefined)).rejects.toThrow(
      "Current password is required",
    );
  });

  it("rejects when current password is wrong", async () => {
    setupRepoRow();
    mockBcrypt.compare.mockResolvedValue(false as never);
    await expect(deleteAccount("u1", "wrong")).rejects.toThrow(
      "Current password is incorrect",
    );
  });

  it("rejects when user not found", async () => {
    mockRepo.findByIdWithHash.mockResolvedValue(null);
    await expect(deleteAccount("nope", "password")).rejects.toThrow(
      "Not found",
    );
  });

  it("writes audit entry and deletes user + review_events in a transaction", async () => {
    setupRepoRow();
    (withTransaction as jest.Mock).mockImplementation(
      async (fn: (c: unknown) => Promise<void>) => {
        const client = { query: jest.fn() };
        await fn(client);
      },
    );

    await deleteAccount("u1", "password");

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(mockAudit.record).toHaveBeenCalledTimes(1);
    expect(mockAudit.record.mock.calls[0][0]).toMatchObject({
      actor: { type: "user", id: "u1" },
      action: "account.deleted",
      targetType: "user",
      targetId: "u1",
    });
    // The audit record was passed a client (the same transaction)
    expect(mockAudit.record.mock.calls[0][1]).toBeDefined();
    expect(mockRepo.deleteUserAccount).toHaveBeenCalledWith(
      "u1",
      expect.any(Object),
    );
  });

  it("does not write before_state (no PII in audit)", async () => {
    setupRepoRow();

    await deleteAccount("u1", "password");

    const params = mockAudit.record.mock.calls[0][0];
    expect(params.beforeState).toBeUndefined();
    expect(params.afterState).toBeUndefined();
  });
});

describe("login with 2FA enabled", () => {
  function userRow(twoFactorEnabled: boolean) {
    return {
      id: "u1",
      email: "a@b.com",
      role: "user",
      account_type: "free",
      email_verified_at: null,
      display_name: null,
      language: null,
      two_factor_enabled: twoFactorEnabled,
      password_hash: "$2a$12$hashhashhash",
    };
  }

  it("returns a challenge instead of tokens", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(userRow(true));
    const result = await login("a@b.com", "password123", false);
    expect(result.requiresTwoFactor).toBe(true);
    if (!result.requiresTwoFactor) throw new Error("unreachable");
    expect(typeof result.challenge).toBe("string");
    // No session material until the code step succeeds.
    expect(mockRepo.storeRefreshToken).not.toHaveBeenCalled();
  });

  it("issues tokens directly when 2FA is off", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(userRow(false));
    const result = await login("a@b.com", "password123", false);
    expect(result.requiresTwoFactor).toBeFalsy();
    expect(mockRepo.storeRefreshToken).toHaveBeenCalled();
  });

  it("completes the login with a valid code", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(userRow(true));
    const first = await login("a@b.com", "password123", false);
    if (!first.requiresTwoFactor) throw new Error("expected challenge");

    mockTwoFactor.verifyCode.mockResolvedValue("totp");
    mockRepo.findById.mockResolvedValue(userRow(true));
    const done = await completeTwoFactorLogin(first.challenge, "123456", true);
    expect(done.user.id).toBe("u1");
    expect(done.usedBackupCode).toBe(false);
    expect(mockRepo.storeRefreshToken).toHaveBeenCalled();
  });

  it("flags backup-code use so the controller can audit it", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(userRow(true));
    const first = await login("a@b.com", "password123", false);
    if (!first.requiresTwoFactor) throw new Error("expected challenge");

    mockTwoFactor.verifyCode.mockResolvedValue("backup");
    mockRepo.findById.mockResolvedValue(userRow(true));
    const done = await completeTwoFactorLogin(
      first.challenge,
      "a3f2c-9b01d",
      false,
    );
    expect(done.usedBackupCode).toBe(true);
  });

  it("rejects an invalid code", async () => {
    mockRepo.findByEmailWithHash.mockResolvedValue(userRow(true));
    const first = await login("a@b.com", "password123", false);
    if (!first.requiresTwoFactor) throw new Error("expected challenge");

    mockTwoFactor.verifyCode.mockResolvedValue(null);
    await expect(
      completeTwoFactorLogin(first.challenge, "000000", false),
    ).rejects.toThrow("Invalid two-factor code");
    expect(mockRepo.storeRefreshToken).not.toHaveBeenCalled();
  });

  it("rejects a garbage challenge", async () => {
    await expect(
      completeTwoFactorLogin("not-a-jwt", "123456", false),
    ).rejects.toThrow(/challenge/i);
  });

  it("rejects an access token used as a challenge (purpose binding)", async () => {
    // A regular access token is a valid JWT signed with the same secret —
    // it must NOT be accepted as a 2FA challenge.
    const jwt = jest.requireActual("jsonwebtoken");
    const { getJwtSecret } = jest.requireActual("../../config/env");
    const accessLike = jwt.sign(
      { sub: "u1", email: "a@b.com" },
      getJwtSecret(),
      {
        algorithm: "HS256",
        expiresIn: 60,
      },
    );
    mockTwoFactor.verifyCode.mockResolvedValue("totp");
    await expect(
      completeTwoFactorLogin(accessLike, "123456", false),
    ).rejects.toThrow(/challenge/i);
  });
});
