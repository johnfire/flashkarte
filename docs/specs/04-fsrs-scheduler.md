# 04 — FSRS scheduler (opt-in alternative to the shipped scheduler)

**Priority:** 4 — biggest learning-quality win, needs the most care · **Effort:** ~1–2 weeks
**Scope:** shared (TS + Kotlin) + server + Android. Web unaffected (server does web scheduling).

## Goal

Adopt FSRS (the modern, open, ML-fitted spaced-repetition scheduler; Anki's default) for
interval calculation, per-user opt-in, with the **currently shipped scheduler** retained as
the default until validated.

> **Amended 2026-09-10.** This spec was written when the shipped scheduler was textbook
> SM-2. It is not any more: `7833a91` replaced it with fixed cadences — Again and Hard 1
> day, Good 2 days, and only Easy compounding (4 → 11 → 31 → …). Read every "SM-2" below
> as "the shipped scheduler". The spec is still valid because it is **opt-in**: the
> abstraction wraps whatever ships today unchanged and FSRS is a per-user choice, so
> adopting it does not undo the fixed cadences. Two things do need deciding at
> implementation time: the `users.scheduler` value `'sm2'` is now a misnomer for the
> default (prefer `'fixed'`, migrating existing rows), and FSRS computes intervals from
> modelled stability, so an FSRS user gets growth curves the fixed cadences deliberately
> removed. That is the point of the opt-in, but it means the two schedulers now differ in
> kind, not just in tuning — decide whether that is still wanted before building this.

## Why flashkarte is ready

The algorithm is isolated behind one function (`packages/shared/src/sm2/sm2.ts::calculate`,
Kotlin mirror `domain/sm2/Sm2Algorithm.kt`) — still true after the scheduler swap, since
that swap changed the function's body and not its shape — and the immutable `review_events`
ledger is exactly the full review history FSRS parameter-fitting needs later.

## Requirements

1. **Scheduler abstraction** in `packages/shared`: `Scheduler` interface —
   `calculate(state, rating, now) → {state', dueInDays}`. Wrap existing SM-2 in it
   unchanged. Implement `fsrs.ts` (FSRS-5, published algorithm + default parameters —
   implement from the spec, cite the version in code comments; **no new runtime
   dependency**, the math is ~100 lines). Kotlin mirror. Rating map: 1→Again, 3→Hard,
   4→Good, 5→Easy. Desired retention: constant 0.9 in v1 (single named constant —
   future per-user preference, not now).
2. **Numerical parity harness** (this is where it fails if it fails): a shared fixture
   file (like the parser corpus) of (state, rating) → expected (stability, difficulty,
   interval) vectors, asserted by BOTH Jest and Android unit tests to 6 decimal places —
   the same discipline that caught the SM-2 easiness-rounding drift.
3. **Storage** — migration `0NN` on `card_progress`:
   `ADD COLUMN stability REAL NULL, ADD COLUMN difficulty REAL NULL;`
   plus `ALTER TABLE users ADD COLUMN scheduler TEXT NOT NULL DEFAULT 'fixed';`
   (`'fixed' | 'fsrs'` — see the amendment note; `'sm2'` would name an algorithm that no
   longer ships). The existing easiness/interval/repetitions columns stay authoritative
   for `fixed` users.
4. **Switching**: `PATCH /api/auth/me {scheduler}` (validated). On first FSRS review of a
   card with no stability/difficulty, seed from current SM-2 state per the FSRS
   first-review rules (treat as new if never reviewed). Switching back to sm2 just resumes
   SM-2 state (columns were never dropped). Document that intervals jump on switch.
5. **Server + Android**: `study.service.review/sync` and Android's local SM-2 path pick
   the scheduler by user setting. **Offline caution:** Android must know the user's
   scheduler; deliver it in the auth/me payload and cache it; a stale value self-heals at
   next sync because the server recomputes authoritatively (existing sync semantics —
   server overwrites local progress).
6. **Out of scope v1**: parameter fitting/optimization from the ledger (design note only:
   a later batch job fits per-user weights from `review_events`), per-deck schedulers,
   retention preference UI.

## Acceptance criteria

1. Parity fixtures pass in TS and Kotlin (≥30 vectors incl. lapses, new cards, long
   intervals, EF/difficulty extremes).
2. `fixed` users: byte-identical behavior to today (regression: the existing scheduler
   tests untouched and green).
3. FSRS user: review sequence Good→Good→Again→Good produces the published-algorithm
   intervals (assert exact values from fixtures).
4. Switch sm2→fsrs mid-deck: no crash, no data loss, next review schedules via FSRS;
   switch back resumes SM-2 state.
5. Offline Android study as FSRS user → sync → server state matches local computation
   (parity end-to-end).

## Tests

Shared fixture harness (both ports); server review/sync per scheduler; Android
Sm2/Fsrs unit + ViewModel scheduler selection; migration up on fresh + existing DB.
