package com.flashmd.domain

import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.Card
import com.flashmd.domain.study.DiagnosticStudy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

// Mirror of packages/shared/src/study/diagnostic.test.ts. resolveChoice is
// deterministic and must agree with the TS port; selectOptions shuffle order is
// not compared across ports (RNGs differ) — only invariants.
class DiagnosticStudyTest {
    private val diagnostic = Card(
        id = "c1", deckId = "d1", front = "Pick one:", back = "Back text.",
        label = "dx",
        options = listOf(
            BranchOption("Right", "correct"),
            BranchOption("Confused", "fix"),
            BranchOption("Nope", "end"),
        ),
    )

    private val plain = Card("c2", "d1", "Q", "Answer")

    @Test fun `correct option rates 4 with no remediation`() {
        val r = DiagnosticStudy.resolveChoice(diagnostic, 0)
        assertEquals(true, r.correct)
        assertEquals(4, r.rating)
        assertNull(r.remediationLabel)
    }

    @Test fun `wrong option routes to its remediation label with rating 1`() {
        val r = DiagnosticStudy.resolveChoice(diagnostic, 1)
        assertEquals(false, r.correct)
        assertEquals(1, r.rating)
        assertEquals("fix", r.remediationLabel)
    }

    @Test fun `wrong end option rates 1 with no remediation`() {
        val r = DiagnosticStudy.resolveChoice(diagnostic, 2)
        assertEquals(1, r.rating)
        assertNull(r.remediationLabel)
    }

    @Test fun `out of range index is plain wrong`() {
        val r = DiagnosticStudy.resolveChoice(diagnostic, 9)
        assertEquals(false, r.correct)
        assertEquals(1, r.rating)
        assertNull(r.remediationLabel)
    }

    @Test fun `selectOptions returns all authored options with stable indices`() {
        val options = DiagnosticStudy.selectOptions(diagnostic, emptyList(), 4, Random(1))
        assertEquals(3, options.size)
        assertEquals(listOf("Confused", "Nope", "Right"), options.map { it.text }.sorted())
        assertEquals(1, options.count { it.correct })
        for (option in options) {
            assertEquals(diagnostic.options[option.optionIndex!!].text, option.text)
            val resolution = DiagnosticStudy.resolveChoice(diagnostic, option.optionIndex!!)
            assertEquals(resolution.correct, option.correct)
            assertEquals(resolution.remediationLabel, option.remediationLabel)
        }
    }

    @Test fun `selectOptions builds random distractors around the back`() {
        val pool = listOf("Answer", "D1", "D2", "D3", "D4")
        val options = DiagnosticStudy.selectOptions(plain, pool, 4, Random(2))
        assertEquals(4, options.size)
        val correct = options.filter { it.correct }
        assertEquals(1, correct.size)
        assertEquals("Answer", correct[0].text)
        val distractors = options.filter { !it.correct }.map { it.text }
        assertEquals(distractors.size, distractors.toSet().size)
        assertTrue(distractors.all { it in pool && it != "Answer" })
        assertTrue(options.all { it.optionIndex == null })
    }

    @Test fun `selectOptions never exceeds available options`() {
        val options = DiagnosticStudy.selectOptions(plain, listOf("Answer", "only"), 4, Random(3))
        assertEquals(listOf("Answer", "only"), options.map { it.text }.sorted())
    }
}
