package com.flashmd.sm2

import com.flashmd.domain.sm2.Sm2Algorithm
import com.flashmd.domain.sm2.Sm2Progress
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Sm2AlgorithmTest {

    private fun calc(ef: Double, interval: Int, reps: Int, rating: Int) =
        Sm2Algorithm.calculate(Sm2Progress(ef, interval, reps), rating)

    @Test fun `ef=2_5 interval=0 reps=0 rating=4 → interval=1 ef=2_5`() {
        val r = calc(2.5, 0, 0, 4)
        assertEquals(1, r.interval)
        assertEquals(2.5, r.easiness, 0.01)
    }

    @Test fun `ef=2_5 interval=1 reps=1 rating=4 → interval=6 ef=2_5`() {
        val r = calc(2.5, 1, 1, 4)
        assertEquals(6, r.interval)
        assertEquals(2.5, r.easiness, 0.01)
    }

    @Test fun `ef=2_5 interval=6 reps=2 rating=4 → interval=15 ef=2_5`() {
        val r = calc(2.5, 6, 2, 4)
        assertEquals(15, r.interval)
        assertEquals(2.5, r.easiness, 0.01)
    }

    @Test fun `ef=2_5 interval=6 reps=2 rating=3 → interval=15 ef=2_36`() {
        val r = calc(2.5, 6, 2, 3)
        assertEquals(15, r.interval)
        assertEquals(2.36, r.easiness, 0.01)
    }

    @Test fun `ef=2_5 interval=6 reps=2 rating=1 → interval=1 ef=1_96`() {
        val r = calc(2.5, 6, 2, 1)
        assertEquals(1, r.interval)
        assertEquals(1.96, r.easiness, 0.01)
    }

    @Test fun `ef=1_3 interval=6 reps=2 rating=3 → interval=8 ef=1_3`() {
        val r = calc(1.3, 6, 2, 3)
        assertEquals(8, r.interval)
        assertEquals(1.3, r.easiness, 0.01)
    }

    @Test fun `rating below 3 resets reps to 0`() {
        val r = calc(2.5, 20, 5, 1)
        assertEquals(0, r.repetitions)
        assertEquals(1, r.interval)
    }

    @Test fun `rating 2 also resets`() {
        val r = calc(2.5, 10, 3, 2)
        assertEquals(0, r.repetitions)
        assertEquals(1, r.interval)
    }

    @Test fun `ef never goes below 1_3`() {
        val r = calc(1.3, 6, 2, 1)
        assertTrue(r.easiness >= 1.3)
    }

    @Test fun `reps increment on success`() {
        val r = calc(2.5, 6, 2, 4)
        assertEquals(3, r.repetitions)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `rating 0 throws`() { calc(2.5, 0, 0, 0) }

    @Test(expected = IllegalArgumentException::class)
    fun `rating 6 throws`() { calc(2.5, 0, 0, 6) }
}
