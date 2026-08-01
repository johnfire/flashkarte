# 00 — Guardrails (READ FIRST, applies to every spec in this directory)

Implementing agents MUST read this file, the `README.md` architecture section, and (for
anything touching branching) `docs/superpowers/specs/2026-06-06-branching-decks-design.md`
before coding. These constraints override anything a spec forgets to repeat.

(The old `docs/HANDOFF.md` was retired to `docs/older-docs/` on 2026-08-01 — it is a
point-in-time snapshot and must not be relied on as current.)

## Parser parity — the cardinal rule

The markdown parser exists in three ports: TS (`packages/shared/src/markdown/parser.ts`),
Kotlin (`android/.../data/parser/MdParser.kt`), Python (`python/`, reference).

- **Any parser change ships in TS AND Kotlin in the same PR**, with matching cases added
  to the shared corpus `fixtures/parser-cases.json` (exercised by both TS and Python
  corpus tests).
- **The Python port is FROZEN.** It does not implement branching and will not implement
  new syntax. Do not touch it; note the divergence in the corpus file comments if needed.
- Same discipline for SM-2/scheduling: `packages/shared/src/sm2/` and Kotlin
  `domain/sm2/Sm2Algorithm.kt` change together. History lesson: Android once drifted from
  the server on easiness _rounding_ alone (fixed by rounding to 6dp) — numerical parity
  is part of the contract, write cross-checks.

## Shared-logic rule (anti-drift)

Web is flip-mode only; multiple-choice and branch play are Android-only. This drift must
not widen: **new learning logic (routing, scheduling, scoring, option selection) is
implemented in `packages/shared` and consumed by clients as thin renderers.** A spec that
puts semantics in a ViewModel or React page is being implemented wrong.

## Database & sync rules

- Migrations: numbered `.sql` in `packages/server/src/db/migrations/`, auto-run on server
  start, tracked in `_migrations`. Append-only; check the directory for the next free
  number at implementation time (was `012_api_key_scope.sql` when this pack was written).
- New columns nullable/defaulted so existing rows survive.
- The `review_events` ledger is **immutable and idempotent** (PK `event_id`). Never
  update or delete rows; extend it only with nullable columns. New event-like data gets
  its own ledger table following the same pattern.
- Offline sync (`POST /api/study/sync`) replays events deterministically (per card,
  `reviewed_at` order). Any payload extension must be backward-compatible: old Android
  clients will keep sending the old shape for months — the server accepts both.

## Study semantics (do not change casually)

- Rating scale is **1 / 3 / 4 / 5** (Again/Hard/Good/Easy; 2 unused). Stats bucket
  `≤2→Again`. Keep it.
- Ordered decks: rating < 3 re-queues at front; unordered at end.
- Branch decks currently have no SR state. Spec 01 relaxes this deliberately — nothing
  else may.

## Testing & CI

- Server + shared: Jest. Web: Vitest. Android: JUnit unit tests
  (`./gradlew :app:testDebugUnitTest`), ViewModels use plain `MutableStateFlow` for
  testability. Follow neighbors' patterns and locations.
- Push to `main` deploys to prod (VPS via GHCR) and `android/**` changes publish to Play
  internal. **There is no staging.** Work on a branch; merge = deploy.
- `npm run lint` and typecheck gates are wired in CI — run locally before pushing.

## Do not touch

- `.env` on the VPS, existing migrations, the auth/rate-limit setup, the Python port,
  Play Store assets. No new npm/Gradle dependencies without justifying in the PR.

## Definition of done (all specs)

1. Spec acceptance criteria pass, verified as stated.
2. All workspaces' tests + lint green; Android compiles and unit tests pass.
3. Parser/scheduler changes: corpus updated, TS+Kotlin parity cases added.
4. Old-client compatibility stated in the PR (Android APKs in the field, MCP clients).
5. The commit message records what shipped — there is no separate status doc to update.
