# Two-factor authentication (TOTP)

Opt-in TOTP 2FA per coding-standards §13.1, added in the standards
remediation Phase 6 (2026-07-16).

## User flow

1. **Enable** — Settings → "Enable 2FA": the server generates a TOTP seed,
   returns an otpauth URI + QR code. The user scans it with any
   authenticator app and confirms with one 6-digit code. On success they
   get **10 one-time backup codes**, shown exactly once.
2. **Login** — after a correct password on a 2FA account, the server does
   not issue tokens; it returns `{ requiresTwoFactor, challenge }` where
   the challenge is a 90-second purpose-bound JWT. The client posts it to
   `POST /api/auth/2fa/verify` with a TOTP or backup code to get the real
   session. Backup codes are consumed on use (and audited).
3. **Disable** — Settings → "Disable 2FA" with a current TOTP or backup
   code. Sessions are not invalidated by enable/disable (password change
   already handles session invalidation).

Web and Android both implement all three flows.

## Endpoints

| Route                           | Auth       | Notes                                                                   |
| ------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `POST /api/account/2fa/setup`   | full scope | returns `{ otpauthUri, qrDataUrl }`                                     |
| `POST /api/account/2fa/verify`  | full scope | body `{ code }` → `{ backupCodes }`, flips enabled                      |
| `POST /api/account/2fa/disable` | full scope | body `{ code }`                                                         |
| `POST /api/auth/2fa/verify`     | public     | body `{ challenge, code, rememberMe }` → session; rate-limited 5/15 min |

Deck-scoped MCP keys cannot touch any of the account-side endpoints
(`requireFullScope`).

## Storage & crypto

- The TOTP seed is **encrypted at rest** (AES-256-GCM, per-value IV;
  `utils/secretBox.ts`) — it must be decryptable to verify codes, so
  hashing is wrong here. Column `users.two_factor_secret_enc`.
- The key comes from **`TWO_FACTOR_SECRET_KEY`** (>= 32 chars). Required in
  production — `validateEnv` fails startup without it. Generate once:
  `openssl rand -base64 32`, put it in the VPS `.env`
  (docker-compose.prod.yml passes it through). **Losing/rotating this key
  orphans every enrolled seed** — users would need to re-enroll; treat it
  like the JWT secret.
- Backup codes are random (`xxxxx-xxxxx`), stored only as bcrypt hashes in
  `users.two_factor_backup`, removed as they're used.
- TOTP verification accepts ±30s clock drift.
- Every transition is audited: `2fa.setup_started`, `2fa.enabled`,
  `2fa.disabled`, `2fa.backup_code_used`.

## Dependencies (§10.3)

- `otplib` v13 — RFC 6238 TOTP generate/verify. Imported, not hand-rolled.
- `qrcode` — pairing QR as a data URL, rendered by both clients.

## Tests

- `twoFactor.service.test.ts` — enrollment, wrong codes, backup-code
  single use, encryption round-trip (real otplib codes).
- `auth.service.test.ts` — challenge flow, purpose binding (an access
  token is rejected as a challenge), backup-code audit flag.
- E2E (`e2e/account-lifecycle.spec.ts`) — enables 2FA through the real UI,
  logs in with a generated code, rejects a wrong code.
