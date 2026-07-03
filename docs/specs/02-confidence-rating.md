# 02 — Confidence rating (metacognition signal)

**Priority:** 2 · **Effort:** ~2–3 days · **Scope:** shared + server + Android; web in Spec 08

## Goal

Before the answer is revealed, the learner taps one of **Sure / Think so / Guessing**.
Combined with correctness this exposes the most dangerous learning state — confidently
wrong — which today is indistinguishable from a careless slip.

## Deliberate v1 limitation

Confidence is **recorded and surfaced, not yet scheduled on**. Scheduler consequences
land with FSRS (Spec 04) where the signal can be used properly. Do not invent interval
tweaks in this spec.

## Requirements

1. Migration `0NN`: `ALTER TABLE review_events ADD COLUMN confidence INT NULL;`
   (1=guessing, 2=think-so, 3=sure). Nullable — flip-mode-without-confidence and old
   clients keep working. `/api/study/review` + `/sync` accept optional `confidence`
   (backward-compatible, contract test for old shape).
2. Android: in both flip and MC modes, a compact 3-button confidence bar appears with the
   front, **before** reveal. Tapping is optional in v1 (skippable); choice rides on the
   review event. One DataStore setting: confidence bar on/off (default on).
3. Stats (server `getStats` + Android Stats screen + deck chips): add a **calibration**
   summary per deck — counts for sure+wrong ("danger"), guessing+right ("lucky"),
   sure+right, guessing+wrong. "Danger" cards (sure + rating ≤2, most recent event)
   listed on the deck stats screen.
4. Shared: confidence enum + calibration bucketing function in `packages/shared` (TS +
   Kotlin parity) so Spec 04/05 reuse it.

## Acceptance criteria

1. Review with confidence stores it; without, NULL; old sync payloads accepted.
2. Confidence bar shows pre-reveal only; skipping still allows reveal + rating.
3. Deck stats show calibration buckets; a sure+Again card appears in the danger list.
4. Offline: confidence rides the outbox event and survives sync replay (idempotent).

## Tests

Shared bucketing (both ports); server contract old/new payloads + stats SQL; Android
ViewModel: confidence captured, cleared between cards, absent when bar disabled.
