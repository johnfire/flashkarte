package com.flashmd.domain.sm2

data class Sm2Progress(
    val easiness: Double = 2.5,
    val interval: Int = 0,
    val repetitions: Int = 0,
    /** Rating of the previous review; null for a card never reviewed. */
    val lastRating: Int? = null,
)

data class Sm2Result(
    val easiness: Double,
    val interval: Int,
    val repetitions: Int,
    val lastRating: Int,
)

object Sm2Algorithm {
    /** Days until the next review, per rating. Easy is only the entry value. */
    private const val LAPSE_INTERVAL = 1
    private const val HARD_INTERVAL = 1
    private const val GOOD_INTERVAL = 2
    private const val EASY_ENTRY_INTERVAL = 4

    private const val MIN_EASINESS = 1.3

    /**
     * Flashkarte's scheduler: fixed cadences for Again/Hard/Good, compounding
     * for Easy. rating must be 1–5 (1–2 Again, 3 Hard, 4 Good, 5 Easy).
     *
     * Unlike textbook SM-2, a rating takes effect on the interval it is given
     * for, not the one after: Hard always means tomorrow and Good always means
     * two days, whatever the card did before. Only a card that stays on Easy
     * compounds, and it compounds by the easiness this review just produced.
     *
     * `repetitions` still counts consecutive non-lapsed reviews — the `learned`
     * deck stat filters on it, so it must not be repurposed as an Easy streak.
     * Staying on Easy is detected via `lastRating` instead.
     *
     * Kept identical in packages/shared/src/sm2/sm2.ts and python algorithm.py.
     */
    fun calculate(progress: Sm2Progress, rating: Int): Sm2Result {
        require(rating in 1..5) { "Rating must be 1–5, got $rating" }

        val ef = progress.easiness +
            (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
        // Round to 6 decimals exactly as the TS/Python canonical does. The
        // server is the sync source of truth; an unrounded value drifts from
        // what it stores and triggers spurious sync churn.
        val easiness = Math.round(maxOf(MIN_EASINESS, ef) * 1_000_000.0) / 1_000_000.0

        if (rating < 3) {
            return Sm2Result(easiness, LAPSE_INTERVAL, 0, rating)
        }

        val interval = when (rating) {
            3 -> HARD_INTERVAL
            4 -> GOOD_INTERVAL
            else -> {
                // Entering Easy from any other level restarts at the entry
                // value; only an Easy-after-Easy compounds. Guard the interval
                // so a corrupt or zero row can't schedule a card at 0 days and
                // wedge it as permanently due.
                val stayedOnEasy = progress.lastRating == 5 && progress.interval > 0
                if (stayedOnEasy) {
                    Math.round(progress.interval * easiness).toInt()
                } else {
                    EASY_ENTRY_INTERVAL
                }
            }
        }

        return Sm2Result(easiness, interval, progress.repetitions + 1, rating)
    }
}
