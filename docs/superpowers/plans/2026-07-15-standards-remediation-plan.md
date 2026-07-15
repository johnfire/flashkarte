# Remediation Plan: Bring flashkarte up to coding-standards v1.2

**Created:** 2026-07-15
**Audited against:** `~/.claude/skills/coding-standards/reference/coding-standards-full.md` v1.2
**Context:** Full standards audit of the repo on 2026-07-15 found 5 CRITICAL, 3 HIGH,
and several MEDIUM/LOW deviations. This plan closes them, dependency-ordered so each
phase unblocks the next and every phase ships green (repo has no staging — `main`
deploys to prod on merge).

## Audit findings (summary)

### CRITICAL
1. **Delete-account flow absent** (§13.1) — no button, endpoint, or migration.
2. **Data export / portability absent** (§13.3).
3. **2FA / TOTP absent** (§13.1) — opt-in 2FA mandatory on every web app.
4. **Audit log absent** (§7.6) — no append-only audit; user and AI-agent state-changing
   actions go unrecorded.
5. **Correlation IDs absent** (§7.5) — no request/trace-ID middleware; a unit of work
   cannot be traced across function/service boundaries.

### HIGH
6. **React component size limit exceeded** (§3) — `SettingsPage.tsx` 390 LOC, `LandingPage.tsx`
   223 LOC (limit 200).
7. **E2E test tier missing** (§9.0) — only unit + mock-based integration exist.
8. **No automated a11y check in CI** (§16).

### MEDIUM / LOW
9. Logger missing `source` field (§7.1).
10. Generic variable names: `val`, `data`, `obj`, `result` in a few non-test files (§2.1).
11. Python tkinter GUI lacks type hints (§12.1).
12. `any` in two test files (§11.1) — production code is clean.
13. `console.error` used instead of the existing `logger` in `auth.service.ts:156,336` (§7.4).
14. `utils/` directory name generic (§2.2) — files inside are well-named.
15. AuthPage email `<input>` uses `aria-label` only, no `<label>` element (§16).
16. `morgan("dev")` runs in production (§7.2).

### Verified compliant
- Anti-fragility / error handling (§6): `wrapAsync`, structured `errorHandler`, graceful
  logger degradation, login timing-equalized, atomic refresh rotation.
- Dependency scanning (§10.4): Dependabot + `npm audit` in CI + gitleaks.
- CI/CD (§14): Actions from first push, lint+typecheck+tests, deploy is CI-only.
- TS strict (§12.2): `strict: true` everywhere, zero `any` in production.
- Password storage (§13.2): bcrypt 12 rounds, hashed/time-limited tokens.
- Auth surface (§13.1/13.4): reset + create-account links, `/api/auth` rate-limited,
  email verified, cookies HttpOnly+Secure(prod)+SameSite=strict.
- Naming/files (§2.2): no `utils.ts`/`helpers.ts`; domain-organized.
- Linting (§11): ESLint passes clean (2 warnings only).

---

## Guiding decisions

1. **Foundations before features.** Correlation-ID middleware and the audit log are
   infrastructure the other four fixes depend on (delete must write an audit entry that
   survives; 2FA enable/disable must be audited; AI actions must be attributable). Build
   them first.
2. **One PR per phase, each deployable.** The repo has no staging — `main` deploys to
   prod on merge (`HANDOFF.md`). So every phase ships green and complete, not half-wired.
3. **Split SettingsPage before adding to it.** It's already 390 LOC (limit 200) and will
   grow with delete/export/2FA UI. Decompose it first, then each feature lands as a new
   section component — the page never re-exceeds the limit.
4. **DB transaction for audit + mutation together.** The `withTransaction` helper exists
   (`db/client.ts:49`); audit inserts join the mutation's transaction so they
   commit/rollback atomically. No "audit wrote but the deck didn't" inconsistency.
5. **Match existing patterns.** Domain folders (`controller/routes/service/repository`),
   `wrapAsync`, supertest route tests, numbered migrations, `logger` abstraction. No new
   conventions introduced.

## Grounding facts (verified during audit)

- `withTransaction` helper exists in `packages/server/src/db/client.ts:49` (BEGIN/COMMIT/
  ROLLBACK, auto-releases client).
- Most user-owned tables already have `ON DELETE CASCADE` on `users(id)`: `decks`,
  `cards`, `card_progress`, `refresh_tokens`, `user_api_keys` (migrations 001, 002).
- **`review_events` (migration 008) has no FK to `users`** — a real orphan-row trap the
  delete flow must handle explicitly in-code (`DELETE FROM review_events WHERE user_id`).
- `verify_email_tokens` (003) and `password_reset_tokens` (004) must be checked for
  `ON DELETE CASCADE`; add `015_user_delete_cascade.sql` if any are missing.
- API key scope is recorded on the request: `middleware/auth.ts` sets `req.keyScope`
  (`'full'` for JWTs and personal keys, `'deck'` for MCP keys). Needs `req.keyPrefix` added
  for AI-actor attribution in the audit log.
- Cookies already HttpOnly + Secure(prod) + SameSite=strict (`auth.controller.ts:9-11`).
- `tsconfig.base.json` has `strict: true`, inherited by all packages.

---

## Phase ordering (dependency-driven)

| Phase | What | Unblocks | Risk |
|---|---|---|---|
| 1 | Correlation-ID middleware + logger `source`/`correlationId` | 2,3,4,5 | low |
| 2 | Audit log table + service + wire existing state-changing actions | 3,4,5 | low-med |
| 3 | Split SettingsPage; LandingPage; enable `max-lines` lint rule | 4,5,6 (UI room) | low |
| 4 | Delete-account flow | — | med |
| 5 | Data export | — | low |
| 6 | 2FA / TOTP | — | med-high |
| 7 | E2E tier (Playwright) + a11y axe in CI | validates 4,5,6 | low-med |

---

## Phase 1 — Correlation IDs + logger fields (§7.1, §7.5)

**Goal:** every request carries an ID, propagated to every log line, so any unit of work
is grep-traceable end to end.

**Server (`packages/server`)**
- `middleware/requestId.ts` — new. Generate `crypto.randomUUID()` if no `x-request-id`
  header; attach to `req.correlationId`; set `x-request-id` response header. Mount first
  in `app.ts`, before routers.
- `types/express.d.ts` — add `correlationId: string` to the `Request` augmentation
  (alongside existing `userId`, `keyScope`).
- `utils/logger.ts:33` — add `source` (module.function, via an explicit param) and
  `correlationId` to the JSON line. Use Node `AsyncLocalStorage` to carry the correlation
  ID so callers don't pass it every time — clean, no thread-every-call pollution. Fall
  back to `undefined` if absent.
- `app.ts` — register the middleware; correlation ID present in `errorHandler.ts:25`
  unhandled-error log automatically via ALS.
- **Tests:** `middleware/requestId.test.ts` (header echoed, propagated,
  consumed-when-present), `utils/logger.test.ts` (source + correlationId fields present).

**MCP (`packages/mcp`)** — secondary: add the same middleware to its Express OAuth
routes (`oauth/authorize.ts`, `oauth/token.ts`). The MCP tool calls hit the **server**,
which already gets the ID; for the MCP server's own logs, attach per-request. Defer if it
adds complexity — note as follow-up.

**Acceptance:** a grep for any single correlation ID returns the full path of that
request through server logs.

---

## Phase 2 — Audit log (§7.6)

**Goal:** every state-changing action by a user **or an AI agent** is recorded,
append-only, with actor, action, target, outcome, correlation ID.

### 2a. Schema — migration `014_audit_log.sql`
```sql
CREATE TABLE audit_log (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type      text NOT NULL,          -- 'user' | 'ai-agent'
  actor_id        text NOT NULL,          -- user uuid, or 'ai-agent:<key_prefix>'
  action          text NOT NULL,          -- 'deck.created', 'account.deleted', ...
  target_type     text,                   -- 'deck' | 'user' | 'key' | 'deck_publication'
  target_id       uuid,
  correlation_id  text,                   -- from Phase 1
  outcome         text NOT NULL,          -- 'success' | 'failure'
  before_state    jsonb,                  -- nullable; security-sensitive/destructive only
  after_state     jsonb,                  -- nullable
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- Immutability: reject UPDATE/DELETE at the DB level (defense in depth, not
-- just GRANT discipline — the app role might be over-permissioned).
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE INDEX audit_log_actor_idx ON audit_log(actor_type, actor_id, created_at DESC);
CREATE INDEX audit_log_action_idx ON audit_log(action, created_at DESC);
```
- **Retention:** document a policy (e.g. 12 months) in `docs/audit-retention-policy.md`;
  a separate archival/prune job is out of scope here — leave a tracked TODO. (§7.6 permits
  a separate scoped job; we just don't build it now.)

### 2b. Service — `domains/audit/audit.service.ts`
- `record(params, client?)` — inserts one row. If a `client` is passed, use it (joins the
  caller's transaction); else use the pool. **On insert failure:**
  `logger.error("audit write failed", { correlationId, action })` and **continue** — the
  audit failure is isolated, never blocks the primary operation (anti-fragility §6.3).
  Rationale: for non-destructive ops a dropped audit line is recoverable-from-
  investigation; blocking would make audit a SPOF. Revisit for destructive ops in Phase 4
  (delete writes its audit in the same txn so a failure rolls back the delete — safer
  there).
- Actor attribution helper: `actorFromRequest(req)` →
  `{ type: req.keyScope === 'deck' ? 'ai-agent' : 'user', id: req.keyScope === 'deck' ?
  'ai-agent:' + req.keyPrefix : req.userId }`. Needs the API key prefix on the request —
  extend `middleware/auth.ts` to set `req.keyPrefix` when resolving an API key (from
  `keys.service.ts::resolveKey`). Confirm `resolveKey` returns the prefix; if not, add it.

### 2c. Wire existing actions
Add an `audit.record(...)` call (in-transaction where one exists) to:
- **Decks** (`decks.service.ts`): `importDeck`→`deck.created`, `appendCards`→
  `deck.cards_added`, `update`→`deck.updated`, `remove`→`deck.deleted` (with before-state
  snapshot).
- **Keys** (`keys.service.ts`): create → `key.created`, revoke → `key.revoked`.
- **Admin** (`admin.service.ts`): `createUser`→`admin.user_created`, `setAccountType`→
  `admin.account_type_changed` (before/after), `unpublishDeck`→
  `admin.deck_unpublished`.
- **Auth security-sensitive** (`auth.service.ts`): `changePassword`→`password.changed`,
  `resetPassword`→`password.reset`, `verifyEmail`→`email.verified`. (Login/logout are not
  state-changing — skip per §7.6 "state-changing", though they're worth INFO logs.)

### 2d. Tests
- Unit: `audit.service.test.ts` (inserts, failure-isolated, actor attribution both types).
- Integration: extend the existing `*.routes.test.ts` to assert an `audit_log` row exists
  after each mutating call (they already use `supertest` + mock the service — add a
  `jest.mock` for `audit.service` and assert it was called with the right actor/action).

**Acceptance:** every deck/key/admin/password action produces an append-only row;
`UPDATE audit_log ...` raises.

---

## Phase 3 — Split oversized components (§3)

Do this **before** adding delete/export/2FA UI so there's room.

- **SettingsPage** → extract one component per section into `pages/settings/`:
  `AccountSection.tsx`, `PasswordSection.tsx`, `AppearanceSection.tsx`,
  `LanguageSection.tsx`, `ApiKeysSection.tsx`. `SettingsPage.tsx` becomes a ~60-line
  layout composing them + shared error state. Each section owns its own local state; lift
  only `user`/`updateUser` from context.
- **LandingPage** → `pages/landing/Hero.tsx`, `Features.tsx`, `Footer.tsx`.
- Enable ESLint's built-in `max-lines` rule in `eslint.config.mjs`: `max: 200` for
  `packages/web/src/**/*.tsx` (components) and `max: 1000` for `.ts`. This makes the size
  limits enforced, not aspirational. (Note: `@typescript-eslint` doesn't ship a
  line-count rule; `max-lines` is the built-in mechanism.)

**Acceptance:** `npm run lint` fails on a >200-LOC component; no current component
exceeds it.

---

## Phase 4 — Delete account (§13.1)

**Server**
- `auth.service.ts::deleteAccount(userId, currentPassword)`:
  1. Load user with hash; `bcrypt.compare` current password (re-auth — the "second step"
     beyond clicking delete). Re-auth is stronger than typing "DELETE".
  2. `withTransaction(async (client) => {`
       - Insert `audit_log` row: `action='account.deleted'`, `actor_type='user'`,
         `actor_id=userId`, `outcome='success'`, **before_state = null** (no PII — §13.1:
         the deletion audit entry retains who/when, not the user's email/content). This
         row is committed in the same txn so a failure rolls back the delete.
       - `DELETE FROM review_events WHERE user_id = $1` — **explicit** (no FK, confirmed
         in `008_review_events.sql`).
       - `DELETE FROM users WHERE id = $1` — cascades the rest (`decks`→`cards`→
         `card_progress`, `refresh_tokens`, `user_api_keys`, verification/reset tokens if
         they cascade — **verify** `003`/`004` have `ON DELETE CASCADE`; if not, add to
         this txn).
     `})`.
  3. Clear the caller's refresh cookie.
- Endpoint: `DELETE /api/account` in a new `domains/account/account.routes.ts` (or
  extend `auth.routes.ts`), `requireAuth` + `requireFullScope` (deck-scoped MCP keys must
  not delete accounts). Body: `{ currentPassword }`.
- Wire audit at the service layer (Phase 2 infra).

**Cascade audit (step 0):** grep all migrations for `REFERENCES users(id)` and confirm
`ON DELETE CASCADE`. Fix any missing ones in migration `015_user_delete_cascade.sql` (only
if needed — `review_events` is the known gap; it has no FK at all, handled in-code above).

**Web** — `pages/settings/DangerZoneSection.tsx`: "Delete account" button → modal:
password field + "Type DELETE to confirm" input → calls `DELETE /api/account` → on
success, `logout()` + redirect to landing.

**Android** — `SettingsScreen.kt`: same modal (Compose dialog), `AuthRepository.deleteAccount()`,
clear local DataStore + outbox on success (the local DB has the user's decks/progress —
**must wipe** `FlashkarteDb` locally so a re-created account doesn't see stale data).

**Tests:** service unit (wrong password → `ValidationError`, correct → user gone +
`review_events` gone + audit row present), route integration (401 without auth, 403 for
deck-scoped key, 200 + cascade), web component test, Android ViewModel test.

**Acceptance:** deleting an account leaves zero rows in every user-owned table; one audit
row survives with no PII; sessions invalidated; local Android state wiped.

---

## Phase 5 — Data export (§13.3)

**Server** — `GET /api/account/export` (`requireAuth` + `requireFullScope`),
`account.service.ts::exportData(userId)`:
- Assemble JSON: `{ profile: {email, displayName, accountType, createdAt}, decks: [...with
  cards], cardProgress: [...], reviewEvents: [...], apiKeys: [{name, keyPrefix,
  createdAt}] }` (no key secrets — they're not personal data and must not be re-exposed).
- Synchronous JSON response (personal flashcard datasets are small). If payload ever
  exceeds ~5MB, switch to a background job + notify (§13.3) — note as a TODO.
- Audit: `account.data_exported` (a read, but security-relevant; log it).
- Rate-limit the endpoint (e.g. 5/hour) to prevent abuse.

**Web** — `DangerZoneSection.tsx` (or a new `DataExportSection.tsx`): "Download my data"
button → `fetch` → Blob download as `flashkarte-export-<date>.json`.

**Android** — settings: button → write response body to a file via
`ACTION_CREATE_DOCUMENT` (SAF) or Downloads.

**Tests:** service unit (shape, no secrets), route integration (auth, rate limit), audit
row present.

**Acceptance:** the JSON contains all the user's content; no API key secrets; export is
self-service and audited.

---

## Phase 6 — 2FA / TOTP (§13.1)

**Dependency decision (§10.3):**
- **`otplib`** (TOTP gen/verify, RFC 6238) — ~3k stars, actively maintained, MIT.
  **Import** — cryptography, do not roll your own.
- **`qrcode`** (QR PNG data URL for pairing) — standard, MIT. **Import**.
- Both added to `packages/server` deps; present in the PR description per §10.3.

**Schema — migration `015_two_factor.sql`** (or `016` if delete needed `015`):
```sql
ALTER TABLE users
  ADD COLUMN two_factor_secret_enc text,      -- AES-256-GCM encrypted TOTP seed
  ADD COLUMN two_factor_enabled    boolean NOT NULL DEFAULT false,
  ADD COLUMN two_factor_backup     text[] NOT NULL DEFAULT '{}'; -- bcrypt-hashed backup codes
```
- Encrypt the TOTP secret at rest with a key from `TWO_FACTOR_SECRET_KEY` env (32-byte,
  base64). Add to `config/env.ts` validation (required in prod if 2FA is used — or
  generate-and-warn). Use `crypto.createCipheriv('aes-256-gcm', ...)` with a per-user IV
  stored alongside (prepend to ciphertext). It's a credential, not a password — must be
  decryptable, so encryption (not hashing) is correct.

**Server flows**
- `POST /api/account/2fa/setup` (auth, full scope): generate secret, **encrypt + store**
  (not yet enabled), return `{ otpauthUri, qrDataUrl }`. Audit `2fa.setup_started`.
- `POST /api/account/2fa/verify` `{ code }`: verify against stored secret; on success
  `two_factor_enabled = true`, generate 10 backup codes (return once, store bcrypt-hashed).
  Audit `2fa.enabled`.
- `POST /api/account/2fa/disable` `{ code }`: verify, disable, clear secret + backup.
  Audit `2fa.disabled`.
- **Login change** (`auth.service.ts::login`): after password OK, if
  `two_factor_enabled` → **do not issue tokens**; return
  `{ requiresTwoFactor: true, challenge }` where `challenge` is a short-lived signed JWT
  (90s) binding `userId`. New endpoint `POST /api/auth/2fa/verify` `{ challenge, code }` →
  verify TOTP **or** a backup code (consume backup on use) → issue tokens. Backup code use
  is audited `2fa.backup_code_used`.
- **Rate-limit** `/api/auth/2fa/verify` (e.g. 5/15min per user) — brute-force protection
  (§13.4).
- Include `twoFactorEnabled` in the `/auth/me` payload so clients show status.
- Must invalidate: disabling 2FA shouldn't kill sessions (it's a strengthening op);
  enabling 2FA — keep current session. Password change already kills sessions (existing).

**Web** — `pages/settings/TwoFactorSection.tsx`: setup flow (show QR → enter code → backup
codes one-time display with "copy/save" warning, like the API-key flow already in the
page), disable flow, status chip. Login page: if `requiresTwoFactor`, show code-entry step.

**Android** — settings: same flow (scan QR with system camera or show the otpauth URI).
Login: 2FA step screen. Backup codes shown once.

**Tests:** service unit (setup→verify→enabled, wrong code rejected, backup code
single-use, secret encryption round-trip, login challenge expiry), route integration
(full enable + login-2FA flow, rate limit), audit rows for each transition, web component
test, Android ViewModel test.

**Acceptance:** a user can enable TOTP, is required to enter a code at login, can use a
backup code once, and can disable with a valid code; every transition is audited.

---

## Phase 7 — E2E tier + a11y in CI (§9.0, §16)

- **Playwright** added as a workspace-level dev dep. CI job `e2e` spins up the Docker
  compose stack (Postgres + server + web) or a lightweight variant, runs against a real DB
  (not mocked) — this is the tier the current mock-based route tests don't cover (§9.0:
  "bugs that only show up at the seams").
- Flows: signup → verify email (intercept mail via a test SMTP sink or a dev mailer mode)
  → create deck → study a card → change password → enable 2FA → login with 2FA →
  **delete account** → confirm gone. This validates Phases 4–6 end-to-end.
- `@axe-core/playwright`: run axe against each visited page; fail CI on violations. Covers
  §16 mechanically (contrast, labels, roles, keyboard) — the judgment calls still go to
  review.
- Add `e2e` job to `ci.yml`, runs on PR + merge to main (per §14, e2e at least on merge to
  main).

**Acceptance:** a real signup→delete loop passes in CI; axe reports zero violations on
core pages.

---

## Cross-cutting (all phases)

- **Migrations:** `014_audit_log`, `015_two_factor` (and `015_user_delete_cascade` only
  if the FK audit finds gaps — renumber as needed). Numbering follows existing convention;
  `db/migrate.ts` runs them on start.
- **Docs:** update `docs/HANDOFF.md` and `README.md` auth section per phase; add
  `docs/audit-retention-policy.md` (Phase 2) and `docs/two-factor.md` (Phase 6).
  `docs/privacy` page (web `PrivacyPage.tsx`) gains 2FA/export/delete copy.
- **Lint enforcement:** enable `max-lines` in `eslint.config.mjs` (Phase 3) so the size
  limits can't regress silently.
- **No `any`, no `console` regressions:** existing rules already enforce; new audit/2FA
  code uses the `logger` and typed signatures.
- **Each phase:** lint + typecheck + tests green before merge; CI is the only deploy path
  (already true).

## Sequencing recommendation

Phases **1 → 2 → 3** first (infrastructure + room), then **4 and 5 together** (the account
lifecycle pair), then **6** (2FA, the largest), then **7** (e2e validates the lot). If you
want the fastest path to "standards-compliant on the criticals," 1+2+4+5 close four of the
five critical gaps in roughly that effort order; 2FA (6) is the biggest single piece and
can follow.

## Minor findings (fold into nearest phase or batch)

These don't warrant dedicated phases; fix opportunistically or as a small cleanup PR:
- Rename generic vars (`val` in `mcp/src/index.ts:12`, `data`/`obj`/`result` in a few
  server files) — §2.1.
- `auth.service.ts:156,336` — use `logger` instead of `console.error` — §7.4 (fold into
  Phase 2 since we're already editing that file for audit wiring).
- `app.ts:71` — `morgan("dev")` → structured/combined format in prod, dev format in dev —
  §7.2 (fold into Phase 1, same file).
- `AuthPage.tsx:65` — email input: add `<label htmlFor="email">` instead of `aria-label`
  only — §16 (fold into Phase 3, web touch-up).
- Python tkinter GUI type hints — §12.1 (reference app; low priority, batch or defer).
- `any` in two test files — §11.1 (tiny, batch).
