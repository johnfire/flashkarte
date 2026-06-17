# flashkarte — Session Handoff

_Last updated: 2026-06-05_

## TL;DR

Everything below is **shipped, pushed, and live** at
https://flashkarte.christopherrehm.de (web + server) and published to Play
internal (Android). `main` is clean and in sync with `origin/main`. **#1
Offline-first (Android)** AND **Android full-functionality (decks/library/
settings)** both shipped this session — see below. Next candidates:
**#2 Multiple-choice study mode**, **#3 card series**, **#24 bug-report screen**.
On-device smoke tests of the offline flow + the new Android screens still
pending (no emulator in the build
session).

## Live admin account

- URL: https://flashkarte.christopherrehm.de
- Credentials are NOT stored here. The admin email/password were previously
  committed in plaintext in this file — that password must be rotated (it is in
  git history). Keep `ADMIN_EMAILS` in `/opt/flashkarte/.env` only.
- `ADMIN_EMAILS` (in `/opt/flashkarte/.env`) re-promotes the listed account to
  admin on every server start (`bootstrapAdmins`).

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
| #1    | `6a929fc`→`830a777`  | **Offline-first (Android)** — see the dedicated section below                                                                                                                |

Issues #19–#23 **and #1** are closed. Migrations applied on prod: **006**
(library), **007** (`card_progress.last_rating`), **008** (`review_events`
idempotency ledger for sync).

Test status (all green): server **55** Jest · shared **24** Jest · web **9**
Vitest · Android `compileDebugKotlin` + **64 unit tests** (parser, sm2,
api-contract ×4, db/outbox, local-store, and library/deck/settings/create/
study-choice/study-ordered/mc-options/report-bug ViewModel tests).

Built since (committed on `main`, unpushed — batched for one Play build):
#2 multiple-choice study mode, #3 ordered decks (`is_ordered`), #24 bug
reporting (Android screen → `POST /api/bug-reports` → GitHub issue via
`GITHUB_TOKEN`; no-op-logs when token unset).

## #1 Offline-first — shipped 2026-06-05

- **Server:** migration `008_review_events.sql`; `POST /api/study/sync`
  (`study.service.ts::sync`) dedupes by `event_id` (insert-if-new on the ledger),
  applies events per card in `reviewed_at` order, returns authoritative
  `card_progress`. `/api/study/review` retained for back-compat but Android no
  longer calls it.
- **Android:** SQLDelight store (`data/local/db`, `*.sq` in
  `src/main/sqldelight/com/flashmd/db`) — decks/cards/progress/outbox. Study
  computes SM-2 locally (`domain/sm2/Sm2Algorithm`) and writes a
  `ReviewEvent` to the outbox (`OutboxRepository`); `SyncWorker` (WorkManager,
  Hilt-Work) drains it to `/sync` on connectivity and overwrites local progress.
  Sync-status chip on the deck list; deck list + opened decks cached for offline.
- **Build gotcha (fixed):** KSP doesn't pick up SQLDelight's per-variant
  generated sources, so Hilt couldn't resolve `FlashkarteDb`. `app/build.gradle.kts`
  now registers `build/generated/sqldelight/code/FlashkarteDb/<variant>` into the
  matching Kotlin source set and orders `ksp*Kotlin` after
  `generate*FlashkarteDbInterface`.
- **Out of scope (v1):** web offline / PWA. Offline = study only (no offline
  deck creation, AI/MCP gen, or library browse).
- **Pending:** on-device smoke test (open deck online → airplane mode → study →
  reconnect → outbox drains).
- Spec: `docs/superpowers/specs/2026-06-05-offline-first-design.md`. Plan:
  `docs/superpowers/plans/2026-06-05-offline-first.md`.

## Android full-functionality — shipped 2026-06-05

Brought Android to web parity. **No server changes** — every endpoint already
existed; this was UI + API-client wiring. Published to Play internal.

- **Navigation:** `NavGraph.kt` now has a 3-tab bottom bar (Decks / Library /
  Settings); study/stats/summary/create/library-detail are pushed routes that
  hide the bar.
- **Decks:** new `ui/screens/createdeck/` (paste-Markdown with live card count +
  file import). Per-deck ⋮ menu on `DeckListScreen` → Rename / Add cards /
  Publish-Unpublish (`isPublic`) / Delete. `DeckRepository` gained
  `renameDeck`/`addCards`/`setPublic`; `Deck`/`DeckListItemDto` gained `isPublic`.
- **Library:** `ui/screens/library/` — `LibraryScreen` (searchable list) +
  `LibraryDetailScreen` (card preview + clone). `LibraryRepository` (list/get/
  clone). Clone navigates straight into study.
- **Settings:** `ui/screens/settings/` — display name (`PATCH /auth/me`), account
  info, resend-verification, theme (moved off the deck-list bar into
  `ThemeViewModel.set`), change-password (sends `forgot-password` email → finish
  on web), logout. `AuthRepository` gained `getMe`/`updateProfile`/
  `resendVerification`/`forgotPassword`.
- **API casing (verified):** library + `/auth/me` are camelCase; deck-list +
  clone (`card_count`) are snake_case.
- **Out of scope (v1):** API-key mgmt (web-only), in-app email/password token
  entry (use the emailed web links), offline for library/settings.
- **Tests:** 7 new test classes (3 API-contract + 4 ViewModel). New ViewModels
  back state with a plain `MutableStateFlow` so `.value` is unit-testable without
  a collector.
- Spec: `docs/superpowers/specs/2026-06-05-android-full-functionality-design.md`.
  Plan: `docs/superpowers/plans/2026-06-05-android-full-functionality.md`.

## Open issues

- **#2 Multiple-choice study mode**
- **#3 Card series / branching follow-up questions**
- **#24 bug reporting screen** (pre-existing, unstarted)

## Architecture quick reference

- **Stack:** Express+TS+Postgres (`packages/server`, **Jest**), React+Vite+Tailwind
  (`packages/web`, **Vitest**), shared parser/SM-2 (`packages/shared`, **Jest**),
  MCP (`packages/mcp`), Kotlin/Compose (`android/`), reference Python (`python/`).
- **Parser parity:** the Markdown parser exists in 3 ports (TS/Kotlin/Python).
  The **common** feature set (basic + `Q:/A:` cards, categories, paragraph
  handling, title fallback) is identical across all three and locked by a shared
  corpus — `fixtures/parser-cases.json`, exercised by TS
  (`packages/shared/src/markdown/parser.corpus.test.ts`) and Python
  (`python/tests/unit/test_md_parser_corpus.py`). **Branching (anchors `[label]`
  + `-> target` options) is TS + Kotlin only; the Python reference parser does
  not implement it.** Change the ports together for any common-subset behaviour.
- **Migrations** auto-run on server start (`src/db/migrate.ts`, numbered `.sql`,
  tracked in `_migrations`). Latest is `008_review_events.sql`; add the next as
  `009_*.sql`.
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
