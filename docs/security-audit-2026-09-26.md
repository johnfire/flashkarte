# Pre-deployment audit — 2026-09-26

Decision: hold deployment until the authentication findings below are fixed and regression-tested.

Audited local `main` at `27465dd0b994325dedfbad671f2a40d378d91119`. The owner explicitly scoped this review to local code awaiting deployment. No live-site testing, pushing, or deployment was performed. This report records findings; application code has not been changed.

## Confirmed findings

### 1. P1 — Two-factor login challenge grants full API access

Location: `packages/server/src/domains/auth/auth.service.ts:156-162`; challenge creation at `:307-316`; JWT middleware at `packages/server/src/middleware/auth.ts:45-49`.

`verifyAccessToken` verifies the signature and expiration but does not distinguish an access JWT from a `purpose: "2fa-challenge"` JWT signed with the same key. `requireAuth` assigns either token full scope.

An attacker who knows an account's password can submit it to login, take the returned challenge, and use that challenge as the Bearer credential without entering a second factor. The short 90-second challenge lifetime does not contain the compromise: it can create a permanent full-scope API key.

Reproduced against the real local Express app and disposable PostgreSQL database, with an email-verified synthetic account and 2FA enabled:

- Password login returned `requiresTwoFactor: true`.
- `POST /api/keys` with that challenge as Bearer returned HTTP 201 and `scope: "full"`.
- No authenticator or backup code was submitted.

Fix: use mutually exclusive validation rules for access and challenge tokens, validate the required claims at runtime, and reject challenges on every authenticated API route. Add an HTTP regression proving that a password-only challenge cannot read a profile, access product data, or create keys. This follows [RFC 8725 section 3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.12).

### 2. P2 — Password-reset links can be consumed twice concurrently

Location: `packages/server/src/domains/auth/auth.service.ts:599-606` and reset-token repository functions in `auth.repository.ts:213-225`.

Reset reads the token, hashes a password, updates the user, then deletes the token. Two requests can both pass the initial read before either deletion; both update the password successfully. Anyone possessing the reset link can race the legitimate reset, and the last write determines the resulting password despite the link's single-use contract.

Reproduced with a real database token: two concurrent `resetPassword` calls using the same token and different replacement passwords both fulfilled.

Fix: atomically claim/consume the token and update the password and session revocations in one transaction. Test that concurrent requests yield exactly one success and that a failed password update does not leave partial recovery state.

### 3. P2 — One-time 2FA backup codes can be used twice concurrently

Location: `packages/server/src/domains/account/twoFactor.service.ts:127-135`; `account.repository.ts:354-362`.

Verification reads the backup-code array, compares a code, then replaces the entire array using the earlier snapshot. Concurrent requests can both verify the same code and both return success. Concurrent use of different codes can also overwrite each other's removals.

Reproduced against real PostgreSQL with the production backup-code bcrypt cost of 10: two concurrent verifications of the same code returned `["backup", "backup"]`. A preliminary cost-4 trial did not reproduce the race; the outcome depends on request timing. The successful production-cost reproduction used the actual service and repository without mocked reads or writes.

Fix: remove the matching hash atomically with a predicate requiring it to remain present, and return success only for the request that actually removed it. Alternatively lock the user's 2FA row through verification and consumption. Add real-database concurrency coverage for both same-code and different-code requests.

### 4. P2 — Shared-course learners see feedback controls that always fail

Location: `packages/server/src/domains/learn/screen-comments.service.ts:26`; `help-requests.service.ts:96` and `:110`; controls in `packages/web/src/learn/ScreenView.tsx:75-85`.

Public-course enrollment grants learning access through `findLearningSubject`, but comment and help submissions call `requireOwnedSubject`. The lesson screen renders these controls for learners without checking ownership. An enrolled learner who does not own the course therefore receives “Subject not found” when commenting or asking for more explanation.

Reproduced using two synthetic database users and a public course: enrollment and the learning-access check succeeded, while both feedback services rejected the learner at the ownership check, before screen lookup.

Fix: decide whether feedback is supported for enrolled learners. If supported, authorize through learning access and preserve per-learner privacy and owner response permissions; otherwise hide these actions and explain their availability. Do not broadly remove ownership checks from authoring or comment-resolution routes. Add an enrolled non-owner browser/API regression.

## Validation and limits

- `npm audit --json`: zero reported vulnerabilities across 902 dependency entries, including development dependencies, queried on the audit date.
- `npm test`: 1,195 tests passed across 135 suites/files (MCP 172, server 507, shared 302, web 214).
- Real PostgreSQL integration tests: 219 tests passed across 27 suites, including migrations and HTTP contracts.
- Typecheck, lint, build, and formatting checks passed. Vite reported a non-failing JavaScript chunk-size warning.
- Playwright browser and accessibility suite: all 24 tests passed against the freshly built local production-mode app.

Tests used a disposable local Postgres 16 container bound to `127.0.0.1:55439`, with synthetic data only. HTTP tests needed localhost socket access outside the filesystem sandbox. Dependency auditing initially failed under restricted DNS, then succeeded with network access.

Review covered authentication, account recovery, API-key scope, MCP OAuth, selected ownership/learning boundaries, SVG handling, browser API handling, and CI/deployment configuration. It is a bounded source and test audit, not proof that all vulnerabilities or bugs have been found. Android/Python suites and production infrastructure were outside this web deployment audit. Existing tests passing did not detect the four findings above.
