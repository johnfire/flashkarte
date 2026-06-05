# flashkarte — Session Handoff

_Last updated: 2026-06-05_

## TL;DR

10 commits sit on local `main`, **not yet pushed**. They clear the entire
quick + medium issue backlog plus Android dark mode. The next step is a
**push + live test** (deploy, wire email env on the VPS, verify the email
flows). After that, the three large epics (#1, #2, #3) remain.

## Done this session (committed on `main`, unpushed)

| Issue | Commit    | Summary                                                                                                             |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| #6    | `e17fca3` | Bump vite 5→6.4; esbuild dedupes to 0.25 → `npm audit` clean (dev-only advisory)                                    |
| #7    | `62b6ee7` | Remove dead Android Room layer (data/db, DatabaseModule, room deps)                                                 |
| #8    | `8a0b5de` | Password show/hide eye toggle on AuthPage                                                                           |
| #16   | `ba361a6` | On-brand SVG favicon + index.html link                                                                              |
| #4    | `ea0b174` | Email verification: SMTP infra (nodemailer), 003 migration, verify link on signup, soft banner + resend             |
| #5    | `6c81b91` | Password reset: 004 migration, forgot/reset endpoints (no enumeration, single-use, session invalidation), web pages |
| #10   | `f64ae2e` | Web dark mode (class strategy, system default + toggle, no-flash)                                                   |
| #12   | `45440b8` | Modern landing page at `/welcome`; unauth users routed there                                                        |
| #14   | `6df504b` | `account_type` field (free/paid/admin-gifted/admin) + `GET /api/auth/me` + Settings plan badge                      |
| #18   | `8743bbd` | Android light theme + follow system dark/light                                                                      |

All ten issues are **closed on GitHub**. Test status when committed:
server **31** Jest tests, web **9** Vitest tests, Android `:app:assembleDebug` OK.

Five redundant `anthropic-code-agent` WIP PRs (#9/#11/#13/#15/#17 — duplicates of
the above) were closed; they were the source of the "approve workflow runs"
prompts (PR runs from an app author require approval).

## REQUIRED before/with the push: wire email env on the VPS

The email flows (#4/#5) no-op until SMTP is configured. Reuse the server's
existing mail account (same as art-platform). Add to `/opt/flashkarte/.env`
(owned by `chris`):

```
MAIL_HOST=mail.christopherrehm.de
MAIL_PORT=587
MAIL_USER=contact@christopherrehm.de
MAIL_PASS=<reuse the value from /opt/art-platform/.env — do NOT commit>
MAIL_FROM=flashkarte <contact@christopherrehm.de>
APP_URL=https://flashkarte.christopherrehm.de
```

Then redeploy (push to main runs CI → GHCR → VPS pull) and the migrations
(003/004/005) auto-run on app start.

## Live-test checklist after push

- [ ] Sign up a fresh account → receive verification email → click link → `/verify-email` shows verified; banner disappears.
- [ ] Resend verification works (banner button).
- [ ] Forgot password → receive reset email → `/reset-password` sets a new password → old sessions logged out.
- [ ] `forgot-password` returns the same response for unknown emails (no enumeration).
- [ ] Visual: dark-mode toggle across all screens; `/welcome` landing; Settings "Plan" badge; favicon in tab.
- [ ] Android: install debug build, toggle OS theme → app follows light/dark.

## Remaining open issues (large epics — one session each)

- **#1 Offline-first support with background sync** (web + Android) — _in progress (this is where we go next)._
- **#2 Multiple-choice study mode**
- **#3 Card series / branching follow-up questions**

## Key facts

- Stack: Express+TS+Postgres (`packages/server`), React+Vite+Tailwind (`packages/web`),
  MCP (`packages/mcp`), Kotlin/Compose Android (`android/`). Server tests = **Jest**;
  web tests = **Vitest**. Migrations auto-run on app start (`src/db/migrate.ts`).
- Deploy: push to `main` → GitHub Actions builds GHCR images → VPS pulls. Prod at
  https://flashkarte.christopherrehm.de. Android auto-publishes to Play internal on `android/**` changes.
- ValidationError → HTTP **422** (not 400). `/api/auth` is rate-limited.
- Auth user payload shape: `{ id, email, role, accountType, emailVerifiedAt }`.
