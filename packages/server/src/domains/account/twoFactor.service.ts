import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateSecret, generateURI, verify as verifyTotp } from "otplib";
import { toDataURL } from "qrcode";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../../utils/errors";
import { encryptSecret, decryptSecret } from "../../utils/secretBox";
import { parse } from "../../utils/validate";
import * as repo from "./account.repository";

const ISSUER = "Flashkarte";
const BACKUP_CODE_COUNT = 10;
// Backup codes are random and high-entropy (unlike passwords), so a lighter
// bcrypt cost keeps verification of up-to-10 hashes per login attempt sane.
const BACKUP_BCRYPT_ROUNDS = 10;
// Accept the adjacent 30s window so slight clock drift between the server
// and the user's phone doesn't reject valid codes.
const EPOCH_TOLERANCE_SEC = 30;
const verificationCodeSchema = z
  .string({ error: "A verification code is required" })
  .trim()
  .min(1, "A verification code is required");

async function totpMatches(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verifyTotp({
      token,
      secret,
      epochTolerance: EPOCH_TOLERANCE_SEC,
    });
    return result.valid;
  } catch {
    // otplib throws on non-6-digit input — backup codes land here and must
    // simply not match as TOTP, not blow up the request.
    return false;
  }
}

function generateBackupCode(): string {
  // 10 hex chars, grouped for readability: "a3f2c-9b01d".
  const raw = crypto.randomBytes(5).toString("hex");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

function requireCode(codeIn: unknown): string {
  return parse(verificationCodeSchema, codeIn);
}

/**
 * Start enrollment: generate and store an encrypted TOTP seed (not yet
 * enabled) and return the otpauth URI plus a QR data URL for pairing.
 * Re-running setup before verification replaces the pending seed.
 */
export async function setup(
  userId: string,
): Promise<{ otpauthUri: string; qrDataUrl: string }> {
  const row = await repo.findTwoFactor(userId);
  if (!row) throw new NotFoundError("User not found");
  if (row.two_factor_enabled) {
    throw new ValidationError("Two-factor authentication is already enabled");
  }
  const secret = generateSecret();
  await repo.setTwoFactorSecret(userId, encryptSecret(secret));
  const otpauthUri = generateURI({ secret, issuer: ISSUER, label: row.email });
  const qrDataUrl = await toDataURL(otpauthUri);
  return { otpauthUri, qrDataUrl };
}

/**
 * Complete enrollment: verify one TOTP code against the pending seed, flip
 * the enabled flag, and hand back the one-time backup codes (stored only as
 * bcrypt hashes — this is the single time they exist in plaintext).
 */
export async function enable(
  userId: string,
  codeIn: unknown,
): Promise<{ backupCodes: string[] }> {
  const code = requireCode(codeIn);
  const row = await repo.findTwoFactor(userId);
  if (!row) throw new NotFoundError("User not found");
  if (row.two_factor_enabled) {
    throw new ValidationError("Two-factor authentication is already enabled");
  }
  if (!row.two_factor_secret_enc) {
    throw new ValidationError("Run 2FA setup first");
  }
  const secret = decryptSecret(row.two_factor_secret_enc);
  if (!(await totpMatches(code, secret))) {
    throw new ValidationError("Invalid verification code");
  }
  const backupCodes = Array.from(
    { length: BACKUP_CODE_COUNT },
    generateBackupCode,
  );
  const hashes = await Promise.all(
    backupCodes.map((c) => bcrypt.hash(c, BACKUP_BCRYPT_ROUNDS)),
  );
  await repo.enableTwoFactor(userId, hashes);
  return { backupCodes };
}

/** Disable 2FA. Requires a currently-valid TOTP or backup code. */
export async function disable(userId: string, codeIn: unknown): Promise<void> {
  const code = requireCode(codeIn);
  const verified = await verifyCode(userId, code, { consumeBackup: false });
  if (!verified) throw new ValidationError("Invalid verification code");
  await repo.disableTwoFactor(userId);
}

/**
 * Check a code for an enabled account: TOTP first, then the backup codes.
 * A matched backup code is consumed (removed) unless `consumeBackup` is
 * false. Returns which kind matched, or null.
 */
export async function verifyCode(
  userId: string,
  codeIn: unknown,
  opts: { consumeBackup: boolean } = { consumeBackup: true },
): Promise<"totp" | "backup" | null> {
  const code = requireCode(codeIn);
  const row = await repo.findTwoFactor(userId);
  if (!row?.two_factor_enabled || !row.two_factor_secret_enc) return null;

  const secret = decryptSecret(row.two_factor_secret_enc);
  if (await totpMatches(code, secret)) return "totp";

  for (const hash of row.two_factor_backup) {
    if (await bcrypt.compare(code, hash)) {
      if (opts.consumeBackup) {
        await repo.updateTwoFactorBackup(
          userId,
          row.two_factor_backup.filter((h) => h !== hash),
        );
      }
      return "backup";
    }
  }
  return null;
}
