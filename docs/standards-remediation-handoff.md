# Standards remediation — session handoff

**Date:** 2026-07-15
**Goal:** Bring flashkarte into compliance with `coding-standards-full.md` v1.2.
**Plan doc:** `docs/superpowers/plans/2026-07-15-standards-remediation-plan.md`
**Status:** COMPLETE (2026-07-16). All phases 1–7 done, minor findings closed.
**Deploy note:** production now requires `TWO_FACTOR_SECRET_KEY` in the VPS `.env` — see docs/two-factor.md — set it BEFORE the next deploy or startup fails.

## What was completed

### Phase 1 — Correlation IDs + logger fields (§7.1, §7.5)

- `packages/server/src/middleware/requestId.ts` — attaches `req.correlationId`, echoes/upstreams `x-request-id`, wraps request in async-local storage.
- `packages/server/src/middleware/accessLog.ts` — structured JSON access log in production; dev keeps `morgan("dev")`.
- `packages/server/src/utils/logger.ts` — emits `ts`, `level`, `source`, `correlationId`, `msg`, and meta. Exports `getCorrelationId()`.
- `packages/server/src/types/express.d.ts` — added `correlationId` and `keyPrefix` to request type.
- `packages/server/src/app.ts` — mounts `requestId` globally; conditionally uses `accessLog` in production.
- Updated all existing `logger.*` call sites (`server.ts`, `errorHandler.ts`, `bootstrap.ts`, `github/issues.ts`, `client-errors.service.ts`) to pass a `source` string.
- Tests: `src/middleware/requestId.test.ts`, `src/utils/logger.test.ts`.

### Phase 2 — Audit log (§7.6)

- `packages/server/src/db/migrations/014_audit_log.sql` — new `audit_log` table with immutability triggers, indexes.
- `packages/server/src/domains/audit/audit.types.ts` — `AuditActor`, `AuditRecordParams`.
- `packages/server/src/domains/audit/audit.repository.ts` — `insertAuditLog()` with optional transaction client.
- `packages/server/src/domains/audit/audit.service.ts` — `record()`, `actorFromRequest()`, `userActor()`, `auditFromRequest()`. Writes are best-effort; failures are logged via `logger.error` but never block the primary operation.
- `packages/server/src/domains/keys/keys.service.ts` — `resolveKey()` now returns `keyPrefix`; `packages/server/src/middleware/auth.ts` sets `req.keyPrefix` for deck-scoped keys.
- Wired audit logging into state-changing controllers:
  - Decks: create, addCards, update, delete
  - API keys: create, revoke
  - Admin: user create, account-type change, deck unpublish
  - Auth: signup, email verification, password change, password reset
  - Library: clone
- `auth.service.ts` — `verifyEmail` and `resetPassword` now return the affected `userId` so the controller can audit.
- `library.service.ts` — `clone()` now returns `{ deck, sourceId }` so the audit can record the original deck id.
- Updated affected tests (`auth.test.ts`, `library.service.test.ts`, `library.routes.test.ts`).
- Added `audit.service.test.ts`.

### Phase 3 — Component split + lint enforcement (§3, §16)

- Split `packages/web/src/pages/SettingsPage.tsx` (390 LOC) into:
  - `pages/settings/AccountSection.tsx`
  - `pages/settings/PasswordSection.tsx`
  - `pages/settings/AppearanceSection.tsx`
  - `pages/settings/LanguageSection.tsx`
  - `pages/settings/ApiKeysSection.tsx`
  - `pages/settings/SettingsPage.tsx` is now a ~25-line layout.
- Split `packages/web/src/pages/LandingPage.tsx` (230 lines) into:
  - `pages/landing/LandingHero.tsx`
  - `pages/landing/LandingFeatures.tsx`
  - `pages/landing/LandingFooter.tsx`
- `eslint.config.mjs` — added `max-lines` enforcement: 200 LOC for web `.tsx` components, 1000 LOC for `.ts`; tests are exempt.
- `packages/web/src/pages/AuthPage.tsx` — replaced email input `aria-label` with a proper `<label htmlFor="email">`.

## Verification status

- `npm run typecheck` — clean.
- `npm run lint` — clean (2 pre-existing React Hook warnings unrelated to this work).
- `npm test` — all workspaces pass:
  - server: 32 suites / 160 tests
  - shared: 5 suites / 60 tests
  - web: 15 suites / 47 tests

### Phase 4 — Delete-account flow (§13.1) — **COMPLETE**

- `packages/server/src/domains/auth/auth.repository.ts` — `deleteUserAccount(userId, client?)` deletes `review_events` then `users` (other tables cascade via FK).
- `packages/server/src/domains/auth/auth.service.ts` — `deleteAccount(userId, currentPassword)` re-authenticates, runs inside `withTransaction`, writes `account.deleted` audit (no PII), deletes user.
- `packages/server/src/domains/auth/auth.controller.ts` — `deleteAccount` handler clears `fk_refresh` cookie, returns 204.
- `packages/server/src/domains/auth/auth.routes.ts` — `DELETE /auth/account` with `requireAuth` + `requireFullScope`.
- FK cascade verified: all child tables (`refresh_tokens`, `email_verification_tokens`, `password_reset_tokens`, `user_api_keys`, `decks`, `cards`, `card_progress`) have `ON DELETE CASCADE`. `review_events` has no FK — handled explicitly. `audit_log` is append-only and deliberately survives.
- `packages/web/src/pages/settings/DangerZoneSection.tsx` — new section with "Delete account" button → modal with password + "DELETE" confirmation → calls API → logout → redirect to `/`.
- `packages/web/src/api/client.ts` — `api.auth.deleteAccount(currentPassword)` calls `DELETE /auth/account`.
- i18n: delete-account strings added to en, de, fr, es locale files.
- Tests: `auth.service.test.ts` (service unit), `auth.routes.test.ts` (route integration: 401, 403, 200, 422), `SettingsPage.test.tsx` (3 DangerZoneSection tests).
- Android: not yet implemented (deferred — see Outstanding below).

## Completion record (2026-07-16 session)

### Fixes to earlier phases (found during verification)

- `014_audit_log.sql` used `CREATE TRIGGER IF NOT EXISTS` — invalid on
  PostgreSQL; the whole migration rolled back and a deploy would have
  crash-looped prod. Fixed with `CREATE OR REPLACE TRIGGER`, verified on
  postgres:16-alpine.
- `deleteUserAccount` sent two DELETEs in one parameterized query — pg
  prepared statements allow exactly one command, so every real
  delete-account call would have 500'd. Split into two statements,
  verified against real Postgres.
- `audit.service.record()` now rethrows when a transaction client is
  passed (atomic callers roll back cleanly); the pool path stays
  best-effort.
- Prettier formatting fixed repo-wide (the Phases 1–4 commit had failed
  CI's format check, which is the only reason the broken migration never
  reached prod).
- CI test job now runs the compiled migration runner against a real
  Postgres 16 service — broken migration SQL can no longer reach deploy.

### Phase 4 Android half — delete account

`DELETE /api/auth/account` from a two-step dialog (password + typed
DELETE); on success one SQLDelight transaction wipes decks/cards/progress/
outbox, the session store and refresh cookie are cleared, and the flipped
session flow returns to the auth screen. ViewModel tests cover gating,
happy path, wrong password.

### Phase 5 — data export (§13.3)

`GET /api/account/export` (full scope, 5/hour) → JSON with profile, decks+
cards, progress, review events, API-key metadata (no secrets — tested).
Audited as `account.data_exported`. Web download button + Android SAF
export. New `domains/account/` (repository/service/controller/routes).

### Phase 6 — 2FA / TOTP (§13.1)

See docs/two-factor.md. otplib v13 + qrcode; migration 015; AES-256-GCM
seed encryption keyed by `TWO_FACTOR_SECRET_KEY` (required in prod);
90s purpose-bound login challenge; backup codes hashed + single-use;
rate-limited verify; every transition audited; web + Android flows;
13 service tests + 7 login-flow tests + E2E coverage.

### Phase 7 — E2E + a11y (§9.0, §16)

`e2e/` Playwright suite runs the real server (production mode, built SPA)
against real Postgres: signup → email verification (MAIL_FILE_SINK) →
deck creation → study → password change → 2FA enrollment + login →
data export → account deletion → dead credentials. axe WCAG 2.0/2.1 A+AA
on eight core pages, zero violations enforced (three real violations found
and fixed: language-switcher contrast, auth footer contrast, privacy-page
link underlines). CI `e2e` job gates deploy alongside test + security.

### Minor findings

All closed: generic variable renames, auth.service `console.error` →
logger, MCP test `any`s removed, Python tkinter GUI fully type-hinted.

## Key design decisions to preserve

1. Audit writes are controller-side for HTTP-triggered actions; service-side only when the actor isn't available on the request (verifyEmail/resetPassword return `userId`). Delete-account is service-side and audits inside its transaction — a failed audit rolls back the deletion.
2. Deck-scoped MCP keys are treated as AI actors: `actor.type='ai-agent'`, `actor.id='ai-agent:<keyPrefix>'`.
3. Audit writes never block the primary operation; failures are logged. The delete-account exception will couple audit insertion in the same transaction so a failed audit rolls back the deletion.
4. Request IDs span the full request lifecycle via `AsyncLocalStorage`; audit reads the same store as the logger, so correlation IDs propagate automatically.

## How to resume

1. Re-read the plan: `docs/superpowers/plans/2026-07-15-standards-remediation-plan.md`.
2. Pick Phase 5 next (data export). Phase 1–4 infra is in place.
3. Run `npm run typecheck && npm run lint && npm test` before starting and after finishing each phase.
4. Each phase should be a deployable, CI-green unit (repo has no staging; `main` deploys on merge).
5. Android delete-account UI (SettingsScreen dialog + local SQLDelight wipe) is deferred — implement alongside Phase 5 or 6.
