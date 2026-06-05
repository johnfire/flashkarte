# flashkarte — Session Handoff

_Last updated: 2026-06-05_

## TL;DR

Everything below is **shipped, pushed, and live** at
https://flashkarte.christopherrehm.de (web + server) and published to Play
internal (Android). `main` is clean and in sync with `origin/main`. The next
piece of work is the first large epic: **#1 Offline-first support with
background sync** — design-first, not yet started.

## Live admin account

- URL: https://flashkarte.christopherrehm.de
- Email: `car2187bus@pm.me` — `account_type=admin`, email pre-verified
- Password: `kKJz4ayiUF-fk24` (change via Settings/forgot-password when convenient)
- `ADMIN_EMAILS=car2187bus@pm.me` is set in `/opt/flashkarte/.env`, so this
  account is re-promoted to admin on every server start (`bootstrapAdmins`).

## Done this session (all deployed)

| Issue | Commit               | Summary                                                                                                                                                                      |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #19   | `bfab287`            | **Admin user management** — `requireAdmin`, `/api/admin/users` (list/create/set account_type), `/admin` web page, admin-created users auto-verified with an initial password |
| —     | `733cf08`            | Dark animated landing page (aurora + floating cards), real description, free-signup CTA                                                                                      |
| —     | `1cffa3f`            | German **Impressum** page (`/impressum`, §5 DDG) linked from landing + auth footers                                                                                          |
| #20   | `02bb2c6`            | **Q:/A: import format** accepted alongside `**1. Front**`; mirrored in all 3 parser ports (TS/Kotlin/Python)                                                                 |
| #21   | `17e68a5`            | **Public deck library** — publish/unpublish, browse `/library`, clone; `users.display_name`; admin unpublish                                                                 |
| #22   | `1573fda`            | **Per-deck learning stats** — viewed / Again·Hard·Good·Easy / not-viewed; deck-list chips (web) + Android Stats screen                                                       |
| #23   | `e9b3761`, `93f61a5` | **Theme** — web global toggle + dark form controls; **Settings → Appearance Light/Dark buttons**; Android System/Light/Dark in DataStore + deck-list toggle                  |

Issues #19–#23 are closed. Migrations applied on prod: **006** (library:
`users.display_name`, `decks.is_public`/`published_at`) and **007**
(`card_progress.last_rating`).

Test status (all green): server **45** Jest · shared **24** Jest · web **9**
Vitest · Android `compileDebugKotlin` + parser unit tests.

## Open issues

- **#1 Offline-first support with background sync** ← _next; see below_
- **#2 Multiple-choice study mode**
- **#3 Card series / branching follow-up questions**
- **#24 bug reporting screen** (pre-existing, unstarted)

## Next up: #1 Offline-first (design-first)

**Goal:** study with no connection, sync progress on reconnect — Android
especially; web optionally as a PWA.

**Recommended approach when starting:** brainstorm/design before code. Key
decisions to make:

- **Android local store:** Room was _removed_ in `62b6ee7` (commit on the
  notes-world-style cleanup) — it would be re-introduced for the offline cache,
  or use SQLDelight/DataStore. Decide.
- **Web:** IndexedDB + service worker (PWA), or skip web offline for v1.
- **Sync engine:** queue review events locally, replay on reconnect with
  backoff. The server owns SM-2; clients post ratings. Conflict policy for
  `card_progress` (last-write-wins per card is likely fine since reviews are
  monotonic, but confirm).
- **What's cached** (decks + due cards) vs **always-online** (library browse,
  AI/MCP generation).
- **Sync status UI** + retry.

The v1 API + data model it depends on are all in place now.

## Architecture quick reference

- **Stack:** Express+TS+Postgres (`packages/server`, **Jest**), React+Vite+Tailwind
  (`packages/web`, **Vitest**), shared parser/SM-2 (`packages/shared`, **Jest**),
  MCP (`packages/mcp`), Kotlin/Compose (`android/`), reference Python (`python/`).
- **Parser parity:** the Markdown parser exists in 3 ports (TS/Kotlin/Python) and
  the code comment requires them identical — change all three together.
- **Migrations** auto-run on server start (`src/db/migrate.ts`, numbered `.sql`,
  tracked in `_migrations`). Add the next as `008_*.sql`.
- **Auth:** `ValidationError → 422`. `/api/auth` rate-limited. User payload:
  `{ id, email, role, accountType, emailVerifiedAt, displayName }`.
  `account_type` ∈ `free|paid|admin-gifted|admin`; admin access = `account_type='admin'`.
- **Deploy:** push to `main` → GitHub Actions (CI test → GHCR build → SSH deploy to
  VPS `docker compose pull && up -d`). Android publishes to Play internal on
  `android/**` changes. Prod at https://flashkarte.christopherrehm.de.
- **VPS:** `claude@82.165.32.162`, `/opt/flashkarte` owned by **claude**, passwordless
  sudo. `.env` holds `ADMIN_EMAILS`, `MAIL_*`, secrets. Logs in `/home/claude/logs`.
- **Theme:** web default follows system pref (inline script in `index.html`),
  user choice persisted in `localStorage`; toggle component + Settings buttons.
  Landing page is force-dark by design. Android theme mode in DataStore.

## Study rating scale

UI grades **1=Again, 3=Hard, 4=Good, 5=Easy** (no 2 used). `card_progress.last_rating`
stores the most recent; stats bucket `≤2→Again, 3→Hard, 4→Good, 5→Easy`.
