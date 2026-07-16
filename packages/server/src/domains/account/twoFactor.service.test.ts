jest.mock("./account.repository");

import { generate, generateSecret } from "otplib";
import * as repo from "./account.repository";
import { encryptSecret, decryptSecret } from "../../utils/secretBox";
import { setup, enable, disable, verifyCode } from "./twoFactor.service";
import { ValidationError } from "../../utils/errors";

const mock = repo as jest.Mocked<typeof repo>;

function twoFactorRow(
  overrides: Partial<repo.TwoFactorRow> = {},
): repo.TwoFactorRow {
  return {
    email: "ada@example.com",
    two_factor_secret_enc: null,
    two_factor_enabled: false,
    two_factor_backup: [],
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe("secretBox round-trip", () => {
  it("encrypts and decrypts a TOTP seed", () => {
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(enc)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces distinct ciphertexts for the same plaintext (fresh IVs)", () => {
    expect(encryptSecret("SECRET")).not.toBe(encryptSecret("SECRET"));
  });
});

describe("twoFactor.setup", () => {
  it("stores an encrypted secret and returns pairing material", async () => {
    mock.findTwoFactor.mockResolvedValue(twoFactorRow());
    mock.setTwoFactorSecret.mockResolvedValue([]);
    const out = await setup("u1");
    expect(out.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(out.otpauthUri).toContain("Flashkarte");
    expect(out.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    // stored value must be encrypted, not the raw secret
    const stored = mock.setTwoFactorSecret.mock.calls[0][1];
    expect(out.otpauthUri).not.toContain(stored);
    expect(decryptSecret(stored)).toMatch(/^[A-Z2-7]+$/);
  });

  it("rejects when 2FA is already enabled", async () => {
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({ two_factor_enabled: true }),
    );
    await expect(setup("u1")).rejects.toThrow(ValidationError);
  });
});

describe("twoFactor.enable", () => {
  it("verifies a valid code, enables, and returns 10 backup codes once", async () => {
    const secret = generateSecret();
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({ two_factor_secret_enc: encryptSecret(secret) }),
    );
    mock.enableTwoFactor.mockResolvedValue([]);
    const code = await generate({ secret });

    const { backupCodes } = await enable("u1", code);
    expect(backupCodes).toHaveLength(10);
    expect(new Set(backupCodes).size).toBe(10);
    // stored hashes, not plaintext
    const storedHashes = mock.enableTwoFactor.mock.calls[0][1];
    expect(storedHashes).toHaveLength(10);
    for (const c of backupCodes) expect(storedHashes).not.toContain(c);
  });

  it("rejects a wrong code without enabling", async () => {
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({ two_factor_secret_enc: encryptSecret(generateSecret()) }),
    );
    await expect(enable("u1", "000000")).rejects.toThrow(
      "Invalid verification code",
    );
    expect(mock.enableTwoFactor).not.toHaveBeenCalled();
  });

  it("rejects when setup was never run", async () => {
    mock.findTwoFactor.mockResolvedValue(twoFactorRow());
    await expect(enable("u1", "123456")).rejects.toThrow(/setup/i);
  });
});

describe("twoFactor.verifyCode", () => {
  const secret = generateSecret();

  it("accepts a current TOTP code", async () => {
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({
        two_factor_enabled: true,
        two_factor_secret_enc: encryptSecret(secret),
      }),
    );
    const code = await generate({ secret });
    expect(await verifyCode("u1", code)).toBe("totp");
  });

  it("returns null for a wrong code", async () => {
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({
        two_factor_enabled: true,
        two_factor_secret_enc: encryptSecret(secret),
      }),
    );
    expect(await verifyCode("u1", "000000")).toBeNull();
  });

  it("returns null when 2FA is not enabled", async () => {
    mock.findTwoFactor.mockResolvedValue(twoFactorRow());
    expect(await verifyCode("u1", "123456")).toBeNull();
  });

  it("accepts a backup code exactly once and consumes it", async () => {
    const bcrypt = await import("bcryptjs");
    const backup = "a3f2c-9b01d";
    const otherHash = await bcrypt.hash("zzzzz-zzzzz", 10);
    const usedHash = await bcrypt.hash(backup, 10);
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({
        two_factor_enabled: true,
        two_factor_secret_enc: encryptSecret(secret),
        two_factor_backup: [otherHash, usedHash],
      }),
    );
    mock.updateTwoFactorBackup.mockResolvedValue([]);

    expect(await verifyCode("u1", backup)).toBe("backup");
    // consumed: only the unused hash remains
    expect(mock.updateTwoFactorBackup).toHaveBeenCalledWith("u1", [otherHash]);
  });
});

describe("twoFactor.disable", () => {
  it("disables with a valid TOTP code", async () => {
    const secret = generateSecret();
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({
        two_factor_enabled: true,
        two_factor_secret_enc: encryptSecret(secret),
      }),
    );
    mock.disableTwoFactor.mockResolvedValue([]);
    await disable("u1", await generate({ secret }));
    expect(mock.disableTwoFactor).toHaveBeenCalledWith("u1");
  });

  it("rejects an invalid code and stays enabled", async () => {
    mock.findTwoFactor.mockResolvedValue(
      twoFactorRow({
        two_factor_enabled: true,
        two_factor_secret_enc: encryptSecret(generateSecret()),
      }),
    );
    await expect(disable("u1", "000000")).rejects.toThrow(ValidationError);
    expect(mock.disableTwoFactor).not.toHaveBeenCalled();
  });
});
