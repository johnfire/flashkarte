import crypto from "crypto";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./keys.repository";

export function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generates a new API key for the user. The raw key is returned ONCE and never
 * stored — only its sha256 hash and a short display prefix are persisted.
 */
export async function createKey(userId: string, name: unknown) {
  const keyName =
    typeof name === "string" && name.trim() ? name.trim().slice(0, 50) : "MCP";
  const rawKey = "fk_" + crypto.randomBytes(32).toString("hex");
  const keyPrefix = rawKey.slice(0, 12);
  const row = await repo.insertApiKey(
    hashKey(rawKey),
    userId,
    keyName,
    keyPrefix,
  );
  if (!row) throw new Error("Failed to create API key");
  // rawKey is returned to the caller exactly once.
  return {
    key: rawKey,
    name: row.name,
    key_prefix: row.key_prefix,
    created_at: row.created_at,
  };
}

export function listKeys(userId: string) {
  return repo.listApiKeys(userId);
}

export async function revokeKey(userId: string, keyPrefix: unknown) {
  if (typeof keyPrefix !== "string" || !keyPrefix.trim()) {
    throw new ValidationError("key prefix is required");
  }
  const deleted = await repo.deleteApiKey(userId, keyPrefix);
  if (!deleted) throw new NotFoundError("API key not found");
}

/** Resolves an fk_ key to its owning user id, or null. */
export async function resolveKey(rawKey: string): Promise<string | null> {
  const row = await repo.findUserByKeyHash(hashKey(rawKey));
  return row?.user_id ?? null;
}
