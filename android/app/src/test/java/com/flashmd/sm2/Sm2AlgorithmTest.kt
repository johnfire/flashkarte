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
        interval: Int,
        reps: Int,
        rating: Int,
        lastRating: Int? = null,
    ) = Sm2Algorithm.calculate(Sm2Progress(ef, interval, reps, lastRating), rating)

    private val fresh = Sm2Progress()

    private fun Sm2Result.asProgress() =
        Sm2Progress(easiness, interval, repetitions, lastRating)

    // --- fixed cadences ---------------------------------------------------

    @Test fun `hard is always tomorrow and good always two days`() {
        var hard = fresh
        var good = fresh
        repeat(6) {
            hard = Sm2Algorithm.calculate(hard, 3).asProgress()
            good = Sm2Algorithm.calculate(good, 4).asProgress()
            assertEquals(1, hard.interval)
            assertEquals(2, good.interval)
        }
    }

    @Test fun `a mature card collapses to the fixed cadence`() {
        assertEquals(2, calc(2.5, 3720, 9, 4, lastRating = 4).interval)
        assertEquals(1, calc(2.5, 3720, 9, 3, lastRating = 4).interval)
    }

    @Test fun `a rating takes effect immediately not one review late`() {
        val hard = Sm2Algorithm.calculate(fresh, 3).asProgress()
        assertEquals(2, Sm2Algorithm.calculate(hard, 4).interval)
        assertEquals(4, Sm2Algorithm.calculate(hard, 5).interval)
    }

    // --- easy -------------------------------------------------------------

    @Test fun `easy enters at four days then compounds`() {
        var s = fresh
        val seq = mutableListOf<Int>()
        repeat(6) {
            s = Sm2Algorithm.calculate(s, 5).asProgress()
            seq.add(s.interval)
        }
        assertEquals(listOf(4, 11, 31, 90, 270, 837), seq)
    }

    @Test fun `easy compounds only after another easy`() {
        assertEquals(11, calc(2.6, 4, 1, 5, lastRating = 5).interval)
        assertEquals(4, calc(2.6, 4, 1, 5, lastRating = 4).interval)
    }

    @Test fun `dropping off easy and back on restarts at the entry value`() {
        var s = Sm2Algorithm.calculate(fresh, 5).asProgress()
        s = Sm2Algorithm.calculate(s, 5).asProgress()
        assertEquals(11, s.interval)
        s = Sm2Algorithm.calculate(s, 4).asProgress()
        assertEquals(2, s.interval)
        assertEquals(4, Sm2Algorithm.calculate(s, 5).interval)
    }

    @Test fun `a zero interval on an easy row cannot schedule zero days`() {
        assertEquals(4, calc(2.5, 0, 3, 5, lastRating = 5).interval)
    }

    // --- state bookkeeping ------------------------------------------------

    @Test fun `rating below 3 resets reps to 0`() {
        val r = calc(2.5, 20, 5, 1, lastRating = 4)
        assertEquals(0, r.repetitions)
        assertEquals(1, r.interval)
    }

    @Test fun `rating 2 also resets`() {
        val r = calc(2.5, 10, 3, 2, lastRating = 5)
        assertEquals(0, r.repetitions)
        assertEquals(1, r.interval)
    }

    @Test fun `ef never goes below 1_3`() {
        assertTrue(calc(1.3, 6, 2, 1).easiness >= 1.3)
    }

    @Test fun `reps count non-lapsed reviews not easy streaks`() {
        assertEquals(3, calc(2.5, 6, 2, 4, lastRating = 4).repetitions)
        assertEquals(3, calc(2.5, 6, 2, 3, lastRating = 5).repetitions)
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
        val r = calc(2.36, 15, 3, 3, lastRating = 4)
        assertEquals(2.22, r.easiness, 0.0)
        assertEquals(1, r.interval)
        assertEquals(4, r.repetitions)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rating 0 throws`() { calc(2.5, 0, 0, 0) }

    @Test(expected = IllegalArgumentException::class)
    fun `rating 6 throws`() { calc(2.5, 0, 0, 6) }
}
