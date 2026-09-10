package com.flashmd.domain.senses

import com.flashmd.data.parser.CardSense

/**
 * Mirror of packages/shared/src/study/senses.ts — keep in sync (Spec 10).
 *
 * Consecutive non-lapsed reviews after which a card counts as stable. This deliberately
 * does NOT gate on interval days: under the fixed-cadence scheduler Hard is always 1 day
 * and Good always 2, so an interval only restates which button was last pressed, and an
 * honest Good-presser would never cross a day threshold. `repetitions` resets on a lapse
 * and is otherwise independent of both the rating and the scheduler.
 */
const val STABLE_REPS = 3

enum class WordPhase { CHAIN, SPLIT }

/**
 * A word stays chained until EVERY sense is stable. Because `repetitions` resets on a
 * lapse, graduation is reversible: failing one sense re-chains the whole word.
 */
fun wordPhase(senseRepetitions: List<Int>): WordPhase =
    if (senseRepetitions.isNotEmpty() && senseRepetitions.all { it >= STABLE_REPS }) {
        WordPhase.SPLIT
    } else {
        WordPhase.CHAIN
    }

/**
 * The prompt rendered where the front would otherwise go. Chain hands the sense over via
 * the hint; split takes the scaffold away and asks with the context sentence. Cards that
 * are not senses always render their front — exactly today's behaviour.
 */
fun promptFor(front: String, sense: CardSense?, phase: WordPhase): String {
    if (sense == null) return front
    if (phase == WordPhase.SPLIT) return sense.context ?: front
    return if (sense.hint != null) {
        "$front — ${sense.hint}?"
    } else {
        "$front — meaning ${sense.index + 1} of ${sense.count}"
    }
}
