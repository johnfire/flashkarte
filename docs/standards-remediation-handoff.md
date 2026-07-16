# Standards remediation — session handoff

**Date:** 2026-07-15
**Goal:** Bring flashkarte into compliance with `coding-standards-full.md` v1.2.
**Plan doc:** `docs/superpowers/plans/2026-07-15-standards-remediation-plan.md`
**Status:** Phases 1–4 complete. Phases 5–7 pending.

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

## Outstanding work (resume here)

### Phase 5 — Data export (§13.3)

- Add `GET /api/account/export` (rate-limited) returning JSON with profile, decks+cards, card progress, review events, key metadata (no secrets).
- Audit `account.data_exported`.
- Web/Android UI: "Download my data" button triggering download.
- Tests: service unit, route integration.

### Phase 6 — 2FA / TOTP (§13.1)

- Dependencies: `otplib`, `qrcode`.
- Migration adding encrypted TOTP secret, enabled flag, backup codes to `users`.
- Endpoints: setup, verify (enable), disable, login-2fa challenge/verify.
- Rate-limit 2FA verify endpoint.
- Web/Android UI for enabling, QR display, backup-code one-time reveal, 2FA login step.
- Audit every 2FA transition.

### Phase 7 — E2E + a11y CI (§9.0, §16)

- Add Playwright workspace dev dependency.
- CI job spinning full Docker stack against real DB.
- Core flow: signup → verify → create deck → study → change password → enable 2FA → login with 2FA → delete account.
- `@axe-core/playwright` a11y assertions per page.

### Minor cleanups (low priority, safe to defer)

- `packages/mcp/src/index.ts:12` — rename `val`.
- `packages/mcp/src/tools/decks.ts:13` — rename `data`.
- `packages/server/src/seo/escape.ts:13` — rename `obj`.
- `packages/server/src/utils/validate.ts:4` — rename `data`.
- `packages/server/src/github/issues.ts:66` — rename `data`.
- `packages/server/src/domains/study/study.service.ts:62` — rename `result`.
- `packages/server/src/domains/auth/auth.service.ts:156,336` — use `logger.error` instead of `console.error`.
- Python tkinter GUI type hints.
- `any` in MCP tests.

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
