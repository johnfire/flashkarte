package com.flashmd.domain.sm2

data class Sm2Progress(
    val easiness: Double = 2.5,
    val interval: Int = 0,
    val repetitions: Int = 0,
)

data class Sm2Result(
    val easiness: Double,
    val interval: Int,
    val repetitions: Int,
)

object Sm2Algorithm {
    /**
     * Pure SM-2 calculation. rating must be 1–5.
     * Interval is calculated using the OLD easiness before EF is updated.
     */
    fun calculate(progress: Sm2Progress, rating: Int): Sm2Result {
        require(rating in 1..5) { "Rating must be 1–5, got $rating" }

        val oldEf = progress.easiness
        val reps = progress.repetitions
        val prevInterval = progress.interval

        val (newInterval, newReps) = if (rating < 3) {
            1 to 0
        } else {
            when (reps) {
                0 -> 1 to 1
                1 -> 6 to 2
                else -> Math.round(prevInterval * oldEf).toInt() to reps + 1
            }
        }

        val newEf = maxOf(
            1.3,
            oldEf + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)
        )

        return Sm2Result(
            easiness = newEf,
            interval = newInterval,
            repetitions = newReps,
        )
    }
}
