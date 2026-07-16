# flashkarte — Session Handoff

_Last updated: 2026-07-16_

## Standards remediation — shipped 2026-07-16

All 7 phases deployed and verified live (see
`docs/standards-remediation-handoff.md`): delete-account (web+Android),
data export (web+Android), opt-in TOTP 2FA (web+Android), audit log,
correlation IDs, Playwright E2E + axe a11y CI gate, migrations **014**
(audit_log) and **015** (two_factor). `TWO_FACTOR_SECRET_KEY` is set in
`/opt/flashkarte/.env` — **required**; the server fails closed without it,
and losing/rotating it orphans every enrolled TOTP seed. Details:
`docs/two-factor.md`, `docs/audit-retention-policy.md`.

## Known debt — Kotlin toolchain upgrade (Android)

The Android build is pinned to **Kotlin 2.0.20** and a queue of dependency
updates is stuck behind it. Mapped 2026-07-16 by building each step locally
— the chain, in the order you hit it:

1. ~~`kotlinOptions { jvmTarget = "11" }` is a hard error on Kotlin 2.x~~ —
   **done** (f9e39f7) — migrated to the `compilerOptions` DSL, which works
   on 2.0.20 today. One domino already cleared.
2. **KSP ↔ AGP**: KSP new enough for Kotlin 2.4 (`2.3.10`) calls
   `AndroidComponentsExtension.addKspConfigurations`, which doesn't exist in
   our pinned **AGP 8.5.2**. This is where the grouped attempt stops now.
3. **AGP → Gradle**: dependabot's AGP target is **9.3.0**, which refuses to
   load on our wrapper: _"Minimum supported Gradle version is 9.5.0.
   Current version is 8.7."_ The wrapper is not a dependabot ecosystem, so
   this step is manual — and it has to come **first**, since nothing else
   applies until Gradle is new enough.

Only then do the libraries blocked behind Kotlin become mergeable:
`coroutines 1.11` and `kotlinx-serialization 1.11` (both pull
`kotlin-stdlib 2.2.20`, unreadable by the 2.0.20 compiler) and
`sqldelight 2.3.2` (forces a newer Kotlin Gradle Plugin).

So: one branch, in this order — **Gradle wrapper 8.7 → 9.5.0**, then
**AGP 8.5.2 → 9.3.0**, then the `kotlin-toolchain` group (kotlin 2.4.10 +
ksp 2.3.10 + composeBom), then drop the ignores for the blocked libraries.
**SQLDelight owns the on-device schema (v2 / `1.sqm`)** — when it moves,
smoke-test the DB upgrade path on a real device, not just the unit suite.

Nothing here is urgent or insecure — the app builds and ships fine on
2.0.20. `.github/dependabot.yml` groups the toolchain (kotlin + ksp +
compose + AGP) and ignores the three blocked libraries so they stop
generating permanently-red PRs. Dependabot PRs #53/#48/#51/#55/#73 were
closed with this evidence.

### Two more pins worth knowing about (same neighbourhood)

Found while triaging the 2026-07-16 dependabot batch — independent of the
Kotlin chain above, each blocking its own set of updates:

- **AGP 8.5.2** — `lifecycleRuntimeKtx 2.11.0` pulls `androidx.compose
1.11.0`, which refuses to build on AGP < 8.6. Same pin that stops KSP.
- **compileSdk 35** — `okhttp 5.x` requires compiling against API 36.

Merged from that batch (verified building): `hiltWork 1.3.0`,
`espresso 3.7.0`, `datastore 1.2.1`. Closed as blocked: #74 (lifecycle,
AGP), #76 (okhttp, compileSdk), #77 (mockk, Kotlin).

## Known debt — Express 5 migration (server)

`express` is pinned to **4.22.2** (current and supported; npm audit clean —
no urgency). Express 5 was attempted 2026-07-16 and is a real migration:

- **`app.get("*")` in `configureProductionWeb` throws** under path-to-regexp
  v8 (`Missing parameter name at index 1: *`) — bare wildcards are gone, it
  needs `/*splat`. That route serves the whole SPA, so merging the bump
  blind would have been a production outage. The SEO/production-web tests
  caught it.
- 27 TypeScript errors, including the `req.userId` Request augmentation.
- Coupled: `express-rate-limit` 8 and `@types/express` 5 target Express 5
  and only make sense alongside it.

Order when done deliberately: wildcard route → `@types/express` 5 + Request
augmentation → `express-rate-limit` 8 → re-verify with the E2E suite.
Dependabot #79/#80 closed with this evidence.

## TL;DR

Everything below is **shipped, pushed, and live** at
https://flashkarte.christopherrehm.de (web + server) and published to Play
internal (Android). `main` is clean and in sync with `origin/main`. Offline-first
(Android), Android full-functionality, **multiple-choice study (#2)**, **card
series / ordered + branching decks (#3)**, **in-app bug reporting (#24)**, **web
i18n**, **SEO**, **MCP Claude.ai OAuth**, and the **user-guide page** have all
shipped — see below. On-device smoke tests of the offline flow + the newer
Android screens are the main remaining manual-QA gap.

## In review — NOT deployed (branch `feat/learning-engine-spec-01`)

**Spec 01 — diagnostic answers** (the learning-engine flagship; see
`docs/specs/01-diagnostic-answers.md`). A wrong multiple-choice option on an
ordinary SR card can route to a remediation card shown as an interlude. Built on
a branch and held for review — **do not merge without Chris's OK** (merge = prod,
no staging). Included: reserved `-> correct` parser target + diagnostic-card
classification (TS + Kotlin; Python frozen); shared `study/` module
(`selectOptions`/`resolveChoice` + Kotlin mirror); server validation, options
persistence, migration **013** (`review_events.option_index`, nullable); Android
MC uses authored options, records `option_index`, shows the remediation interlude
(SQLDelight schema **v2** migration `1.sqm` — adds `cardEntity.label/options` +
`outboxEntity.option_index`; **first on-device DB upgrade — smoke-test before
release**). Web stays flip-only (Spec 08). All TS + Android unit suites green.

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

Shipped since (all on `main`, pushed and deployed):
**#2 multiple-choice study mode**; **#3 ordered decks (`is_ordered`) + branching
decks** (anchors `[label]` + `-> target`); **#24 bug reporting** (Android screen
→ `POST /api/bug-reports` → GitHub issue via `GITHUB_TOKEN`; no-op-logs when
token unset); **web i18n** (`packages/web/src/i18n`, full-locale parity enforced);
**SEO** (`packages/server/src/seo` — server-rendered meta/OG + sitemap/robots);
**MCP Claude.ai OAuth** (`packages/mcp/src/oauth` — authorize/token/discovery);
and the **user-guide page** (`packages/web/src/pages/GuidePage.tsx`).

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

- **#2 Multiple-choice study mode** — **SHIPPED**
- **#3 Card series / branching follow-up questions** — **SHIPPED** (ordered decks
  - branching anchors/options)
- **#24 bug reporting screen** — **SHIPPED**

No tracked issues are currently open. Main remaining gap is on-device manual QA
of the Android offline + newer screens.

## Architecture quick reference

- **Stack:** Express+TS+Postgres (`packages/server`, **Jest**), React+Vite+Tailwind
  (`packages/web`, **Vitest**), shared parser/SM-2 (`packages/shared`, **Jest**),
  MCP (`packages/mcp`), Kotlin/Compose (`android/`), reference Python (`python/`).
- **Parser parity:** the Markdown parser exists in 3 ports (TS/Kotlin/Python).
  The **common** feature set (basic + `Q:/A:` cards, categories, paragraph
  handling, title fallback) is identical across all three and locked by a shared
  corpus — `fixtures/parser-cases.json`, exercised by TS
  (`packages/shared/src/markdown/parser.corpus.test.ts`) and Python
  (`python/tests/unit/test_md_parser_corpus.py`). \*\*Branching (anchors `[label]`
  - `-> target` options) is TS + Kotlin only; the Python reference parser does
    not implement it.\*\* Change the ports together for any common-subset behaviour.
- **Migrations** auto-run on server start (`src/db/migrate.ts`, numbered `.sql`,
  tracked in `_migrations`). Latest is `012_api_key_scope.sql`; add the next as
  `013_*.sql`.
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
