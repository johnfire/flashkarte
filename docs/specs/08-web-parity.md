# 08 — Web parity: multiple choice, branch play, diagnostic interludes

**Priority:** 8 — closes the client drift · **Effort:** ~1 week
**Scope:** packages/web only (consumes shared logic shipped by Specs 01/02/07)

## Goal

The web app stops being flip-only. Everything a learner can do on Android study/play
works in the browser: MC mode, confidence bar, diagnostic interludes, branch/case play
with scoring.

## Prerequisites

Specs 01 (diagnostic + `selectOptions`/`resolveChoice` in shared), 02 (confidence),
07 (case scoring in shared). If implemented before 07, scope case play out explicitly.

## Requirements

1. **Study mode toggle** (`StudyPage`): Flip | Choice, persisted per user — use the
   preferences mechanism if one exists by then, else localStorage (state which in PR).
2. **Choice mode**: options from shared `selectOptions` (authored options on diagnostic
   cards, random distractors otherwise), correct/wrong highlight, rating via shared
   `resolveChoice`, remediation interlude on routed wrong picks (no review event for the
   interlude — same rule as Android, Spec 01 AC-4).
3. **Confidence bar** pre-reveal in both modes (Spec 02 semantics), skippable.
4. **Branch/case play page**: web route for playing a branch deck — graph walk mirrors
   `BranchPlayViewModel` semantics but implemented against shared logic (port the graph
   walk INTO `packages/shared` as part of this spec if Spec 07 didn't already; Android
   ViewModel then delegates to it in a follow-up noted in the PR). Completion posts
   `/api/play/complete`; recap screen shows the Spec 07 score summary.
5. **No web offline** (existing project decision) — online-only play/study is fine.
6. i18n: all new strings through `packages/web/src/i18n` with full-locale parity (CI
   enforces).

## Acceptance criteria

1. A diagnostic card studied in web MC behaves byte-identically (events written,
   interlude shown, ratings) to Android — verified by a shared contract test hitting the
   same API expectations.
2. Branch deck plays start-to-end in web; scored completion writes `path_events`
   (idempotent); recap matches Android for the same choices.
3. Flip-only users see no behavior change until they touch the toggle.
4. Lighthouse/console clean: no errors on study/play pages; keyboard operable
   (options selectable via 1–9, reveal via space — match existing StudyPage keys if any).
5. Locale parity check passes.

## Tests

Vitest: StudyPage choice mode (authored + random paths, interlude, confidence),
play page graph walk + completion, i18n key coverage.
