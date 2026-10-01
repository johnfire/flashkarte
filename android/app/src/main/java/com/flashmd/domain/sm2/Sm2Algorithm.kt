package com.flashmd.domain.sm2

data class Sm2Progress(
    val easiness: Double = 2.5,
    val interval: Double = 0.0,
    val repetitions: Int = 0,
    /** Rating of the previous review; null for a card never reviewed. */
    val lastRating: Int? = null,
)

data class Sm2Result(
    val easiness: Double,
    val interval: Double,
    val repetitions: Int,
    val lastRating: Int,
)

object Sm2Algorithm {
    /** Days until the next review, per rating. */
    private const val HARD_INTERVAL = 0.5
    private const val MEDIUM_INTERVAL = 1.0
    private const val GOOD_INTERVAL = 3.0
    private const val PERFECT_INTERVAL = 7.0

    private const val MIN_EASINESS = 1.3

    /**
     * Flashkarte's scheduler: fixed cadences for Hard, Medium, Good, and
     * Perfect. Rating must be 1–5; 1–2 are treated as Hard for compatibility
     * with older clients and wrong-answer diagnostics.
     *
     * `repetitions` still counts consecutive non-lapsed reviews — the `learned`
     * deck stat filters on it, independent of the displayed rating names.
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

        if (rating <= 2) {
            return Sm2Result(easiness, HARD_INTERVAL, 0, rating)
        }

        val interval = when (rating) {
            3 -> MEDIUM_INTERVAL
            4 -> GOOD_INTERVAL
            else -> PERFECT_INTERVAL
        }

        return Sm2Result(easiness, interval, progress.repetitions + 1, rating)
    }
}
