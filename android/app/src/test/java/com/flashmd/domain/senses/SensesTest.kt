package com.flashmd.domain.senses

import com.flashmd.data.parser.CardSense
import org.junit.Assert.assertEquals
import org.junit.Test

/** Parity with packages/shared/src/study/senses.test.ts. */
class SensesTest {
    private fun sense(
        context: String? = "Der Zug fährt um 8 Uhr ab.",
        hint: String? = "Eisenbahn",
        index: Int = 0,
        count: Int = 3,
    ) = CardSense(context, hint, "der-zug", index, count)

    @Test fun `splits only when every sense is stable`() {
        assertEquals(WordPhase.SPLIT, wordPhase(listOf(3, 3, 3)))
        assertEquals(WordPhase.CHAIN, wordPhase(listOf(3, 3, 2)))
    }

    @Test fun `the boundary is at STABLE_REPS, not above it`() {
        assertEquals(WordPhase.CHAIN, wordPhase(listOf(STABLE_REPS - 1)))
        assertEquals(WordPhase.SPLIT, wordPhase(listOf(STABLE_REPS)))
    }

    @Test fun `a lapse on one sense re-chains the whole word`() {
        assertEquals(WordPhase.CHAIN, wordPhase(listOf(9, 0)))
    }

    @Test fun `a word with no progress rows yet is chained`() {
        assertEquals(WordPhase.CHAIN, wordPhase(emptyList()))
    }

    @Test fun `chain hands the sense over via the hint`() {
        assertEquals("der Zug — Eisenbahn?", promptFor("der Zug", sense(), WordPhase.CHAIN))
    }

    @Test fun `chain falls back to position when no hint was authored`() {
        assertEquals(
            "der Zug — meaning 2 of 3",
            promptFor("der Zug", sense(hint = null, index = 1), WordPhase.CHAIN),
        )
    }

    @Test fun `split asks with the context sentence`() {
        assertEquals(
            "Der Zug fährt um 8 Uhr ab.",
            promptFor("der Zug", sense(), WordPhase.SPLIT),
        )
    }

    @Test fun `split falls back to the headword when no context was authored`() {
        assertEquals("der Zug", promptFor("der Zug", sense(context = null), WordPhase.SPLIT))
    }

    @Test fun `an ordinary card renders its front in either phase`() {
        assertEquals("der Zug", promptFor("der Zug", null, WordPhase.CHAIN))
        assertEquals("der Zug", promptFor("der Zug", null, WordPhase.SPLIT))
    }
}
