package com.flashmd.sm2

import com.flashmd.domain.sm2.Sm2Algorithm
import com.flashmd.domain.sm2.Sm2Progress
import com.flashmd.domain.sm2.Sm2Result
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Sm2AlgorithmTest {

    private fun calc(
        ef: Double,
        interval: Double,
        reps: Int,
        rating: Int,
        lastRating: Int? = null,
    ) = Sm2Algorithm.calculate(Sm2Progress(ef, interval, reps, lastRating), rating)

    private val fresh = Sm2Progress()

    private fun Sm2Result.asProgress() =
        Sm2Progress(easiness, interval, repetitions, lastRating)

    // --- fixed cadences ---------------------------------------------------

    @Test fun `the four ratings always use their fixed intervals`() {
        var hard = fresh
        var medium = fresh
        var good = fresh
        var perfect = fresh
        repeat(6) {
            hard = Sm2Algorithm.calculate(hard, 1).asProgress()
            medium = Sm2Algorithm.calculate(medium, 3).asProgress()
            good = Sm2Algorithm.calculate(good, 4).asProgress()
            perfect = Sm2Algorithm.calculate(perfect, 5).asProgress()
            assertEquals(0.5, hard.interval, 0.0)
            assertEquals(1.0, medium.interval, 0.0)
            assertEquals(3.0, good.interval, 0.0)
            assertEquals(7.0, perfect.interval, 0.0)
        }
    }

    @Test fun `a mature card collapses to the fixed cadence`() {
        assertEquals(3.0, calc(2.5, 3720.0, 9, 4, lastRating = 4).interval, 0.0)
        assertEquals(1.0, calc(2.5, 3720.0, 9, 3, lastRating = 4).interval, 0.0)
    }

    @Test fun `a rating takes effect immediately not one review late`() {
        val hard = Sm2Algorithm.calculate(fresh, 3).asProgress()
        assertEquals(3.0, Sm2Algorithm.calculate(hard, 4).interval, 0.0)
        assertEquals(7.0, Sm2Algorithm.calculate(hard, 5).interval, 0.0)
    }

    // --- fixed Perfect cadence --------------------------------------------

    @Test fun `perfect stays at one week`() {
        var s = fresh
        val seq = mutableListOf<Double>()
        repeat(6) {
            s = Sm2Algorithm.calculate(s, 5).asProgress()
            seq.add(s.interval)
        }
        assertEquals(List(6) { 7.0 }, seq)
    }

    // --- state bookkeeping ------------------------------------------------

    @Test fun `rating below 3 resets reps to 0`() {
        val r = calc(2.5, 20.0, 5, 1, lastRating = 4)
        assertEquals(0, r.repetitions)
        assertEquals(0.5, r.interval, 0.0)
    }

    @Test fun `rating 2 also resets`() {
        val r = calc(2.5, 10.0, 3, 2, lastRating = 5)
        assertEquals(0, r.repetitions)
        assertEquals(0.5, r.interval, 0.0)
    }

    @Test fun `ef never goes below 1_3`() {
        assertTrue(calc(1.3, 6.0, 2, 1).easiness >= 1.3)
    }

    @Test fun `reps count non-lapsed reviews not easy streaks`() {
        assertEquals(3, calc(2.5, 6.0, 2, 4, lastRating = 4).repetitions)
        assertEquals(3, calc(2.5, 6.0, 2, 3, lastRating = 5).repetitions)
    }

    @Test fun `last rating is carried into the result`() {
        assertEquals(5, Sm2Algorithm.calculate(fresh, 5).lastRating)
        assertEquals(1, Sm2Algorithm.calculate(fresh, 1).lastRating)
    }

    // Regression: easiness must be rounded to 6 decimals to match the TS/Python
    // canonical, since the server is the sync source of truth. Here the raw
    // float is 2.2199999999999998; an unrounded port drifts to a value the
    // server never stores, causing needless sync churn. Delta 0.0 = exact.
    @Test fun `easiness is rounded to 6dp to match the server`() {
        val r = calc(2.36, 15.0, 3, 3, lastRating = 4)
        assertEquals(2.22, r.easiness, 0.0)
        assertEquals(1.0, r.interval, 0.0)
        assertEquals(4, r.repetitions)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rating 0 throws`() { calc(2.5, 0.0, 0, 0) }

    @Test(expected = IllegalArgumentException::class)
    fun `rating 6 throws`() { calc(2.5, 0.0, 0, 6) }
}
