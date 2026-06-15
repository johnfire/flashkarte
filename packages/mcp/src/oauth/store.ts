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

const authCodes = new Map<string, AuthCodeEntry>();
const refreshTokens = new Map<string, RefreshTokenEntry>();
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

function loadStore(): void {
  if (!STORE_PATH || !fs.existsSync(STORE_PATH)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    for (const [k, v] of raw.refreshTokens ?? []) refreshTokens.set(k, v);
    for (const [k, v] of raw.consumedTokens ?? []) consumedTokens.set(k, v);
    pruneExpired(refreshTokens);
    pruneExpired(consumedTokens);
  } catch (e) {
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
      JSON.stringify({
        refreshTokens: [...refreshTokens],
        consumedTokens: [...consumedTokens],
      }),
      {
        mode: 0o600,
      },
    );
    fs.renameSync(tmp, STORE_PATH);
  } catch (e) {
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
