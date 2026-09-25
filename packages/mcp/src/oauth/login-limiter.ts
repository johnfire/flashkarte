// Per-IP limit on login and 2FA attempts: the authorize POST is otherwise an
// unauthenticated password-guessing oracle against real flashkarte accounts.
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_IPS = 10_000;

export interface LoginLimiter {
  /** Count one attempt; true once this IP is over the limit. */
  isLimited(ip: string | undefined): boolean;
}

export function createLoginLimiter(): LoginLimiter {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  function sweepExpired(): void {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (entry.resetAt < now) attempts.delete(key);
    }
  }

  // Unref'd so the timer never keeps the process alive (tests, CLI runs).
  setInterval(sweepExpired, ATTEMPT_WINDOW_MS).unref();

  return {
    isLimited(ip) {
      const key = ip ?? "unknown";
      const now = Date.now();
      if (attempts.size >= MAX_TRACKED_IPS) sweepExpired();
      const entry = attempts.get(key);
      if (!entry || entry.resetAt < now) {
        attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
        return false;
      }
      entry.count += 1;
      return entry.count > ATTEMPT_LIMIT;
    },
  };
}
