import crypto from "crypto";
import fs from "fs";

interface AuthCodeEntry {
  code_challenge: string;
  redirect_uri: string;
  client_id: string;
  fk_key: string;
  expires_at: number;
}

interface RefreshTokenEntry {
  fk_key: string;
  expires_at: number;
}

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Keep in sync with ACCESS_TOKEN_TTL_SEC in tokens.ts (1h). Access sessions are
// deliberately in-memory only: a restart invalidates access tokens (clients
// silently re-mint via their persisted refresh token), and the fk_ key for an
// access token never touches disk.
const ACCESS_SESSION_TTL_MS = 60 * 60 * 1000;

const authCodes = new Map<string, AuthCodeEntry>();
const refreshTokens = new Map<string, RefreshTokenEntry>();
const accessSessions = new Map<string, RefreshTokenEntry>();
// Tombstones of already-rotated refresh tokens, kept until they would have
// expired. A token's lineage is its fk_key (one OAuth connection mints one
// fk_key and keeps it across rotations). Presenting a tombstoned token is a
// replay, so we revoke the whole lineage — OAuth 2.1 refresh-reuse detection.
const consumedTokens = new Map<string, RefreshTokenEntry>();

// Restart survival: refresh tokens are write-through persisted to
// MCP_STORE_PATH (a docker volume in prod). Without this every deploy
// wiped the store and connectors (claude.ai etc.) had to re-authenticate.
// authCodes are 10-minute ephemera and deliberately not persisted.
const STORE_PATH = process.env.MCP_STORE_PATH || "";

// At-rest encryption for the persisted store (it holds long-lived fk_ keys).
// Keyed off MCP_JWT_SECRET so a leaked volume/backup snapshot without the env
// is useless. If the secret is unset (local dev / tests), fall back to plaintext.
const STORE_ENC_PREFIX = "enc:v1:";

interface PersistedStore {
  refreshTokens?: [string, RefreshTokenEntry][];
  consumedTokens?: [string, RefreshTokenEntry][];
}

function storeKey(): Buffer | null {
  const secret = process.env.MCP_JWT_SECRET;
  return secret ? crypto.createHash("sha256").update(secret).digest() : null;
}

function serializeStore(payload: PersistedStore): string {
  const plain = JSON.stringify(payload);
  const key = storeKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return STORE_ENC_PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

function deserializeStore(raw: string): PersistedStore {
  if (raw.startsWith(STORE_ENC_PREFIX)) {
    const key = storeKey();
    if (!key) throw new Error("store is encrypted but MCP_JWT_SECRET is unset");
    const buf = Buffer.from(raw.slice(STORE_ENC_PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([
      decipher.update(ct),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plain) as PersistedStore;
  }
  return JSON.parse(raw) as PersistedStore; // legacy plaintext
}

function loadStore(): void {
  if (!STORE_PATH || !fs.existsSync(STORE_PATH)) return;
  try {
    const raw = deserializeStore(fs.readFileSync(STORE_PATH, "utf8"));
    for (const [k, v] of raw.refreshTokens ?? []) refreshTokens.set(k, v);
    for (const [k, v] of raw.consumedTokens ?? []) consumedTokens.set(k, v);
    pruneExpired(refreshTokens);
    pruneExpired(consumedTokens);
  } catch (e) {
    // eslint-disable-next-line no-console -- MCP server logs directly to stderr
    console.error("oauth store load failed, starting empty:", e);
  }
}

let persistTimer: NodeJS.Timeout | null = null;
function persistStore(): void {
  if (!STORE_PATH || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, 100);
  persistTimer.unref?.();
}

function persistNow(): void {
  if (!STORE_PATH) return;
  try {
    const tmp = STORE_PATH + ".tmp";
    fs.writeFileSync(
      tmp,
      serializeStore({
        refreshTokens: [...refreshTokens],
        consumedTokens: [...consumedTokens],
      }),
      {
        mode: 0o600,
      },
    );
    fs.renameSync(tmp, STORE_PATH);
  } catch (e) {
    // eslint-disable-next-line no-console -- MCP server logs directly to stderr
    console.error("oauth store persist failed:", e);
  }
}

process.once("SIGTERM", persistNow);
process.once("SIGINT", persistNow);
loadStore();

function pruneExpired<T extends { expires_at: number }>(
  map: Map<string, T>,
): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expires_at < now) map.delete(key);
  }
}

export function createAuthCode(
  params: Omit<AuthCodeEntry, "expires_at">,
): string {
  pruneExpired(authCodes);
  const code = crypto.randomBytes(32).toString("hex");
  authCodes.set(code, { ...params, expires_at: Date.now() + AUTH_CODE_TTL_MS });
  return code;
}

export function consumeAuthCode(code: string): AuthCodeEntry | null {
  const entry = authCodes.get(code);
  authCodes.delete(code);
  if (!entry || entry.expires_at < Date.now()) return null;
  return entry;
}

/**
 * Bind a short-lived access session to an fk_ key and return its opaque id.
 * The id (not the key) is what goes into the access-token JWT.
 */
export function createAccessSession(fk_key: string): string {
  pruneExpired(accessSessions);
  const sid = crypto.randomBytes(32).toString("hex");
  accessSessions.set(sid, {
    fk_key,
    expires_at: Date.now() + ACCESS_SESSION_TTL_MS,
  });
  return sid;
}

export function resolveAccessSession(sid: string): { fk_key: string } | null {
  const entry = accessSessions.get(sid);
  if (!entry) return null;
  if (entry.expires_at < Date.now()) {
    accessSessions.delete(sid);
    return null;
  }
  return { fk_key: entry.fk_key };
}

export function createRefreshToken(fk_key: string): string {
  pruneExpired(refreshTokens);
  pruneExpired(consumedTokens);
  const token = crypto.randomBytes(48).toString("hex");
  refreshTokens.set(token, {
    fk_key,
    expires_at: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  persistStore();
  return token;
}

export function consumeRefreshToken(token: string): { fk_key: string } | null {
  pruneExpired(refreshTokens);
  pruneExpired(consumedTokens);
  const entry = refreshTokens.get(token);
  if (entry) {
    // Normal rotation: spend the token, tombstone it for reuse detection.
    refreshTokens.delete(token);
    consumedTokens.set(token, entry);
    persistStore();
    if (entry.expires_at < Date.now()) return null;
    return { fk_key: entry.fk_key };
  }
  // Not live. If it was consumed before, this is a replay of a rotated-away
  // token — revoke every live token in the same lineage (fk_key) so a stolen
  // token can't outlive detection, then reject.
  const replayed = consumedTokens.get(token);
  if (replayed) {
    for (const [t, e] of refreshTokens) {
      if (e.fk_key === replayed.fk_key) refreshTokens.delete(t);
    }
    persistStore();
  }
  return null;
}
