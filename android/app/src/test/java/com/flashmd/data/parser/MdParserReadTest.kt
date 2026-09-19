package com.flashmd.data.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Parity with the TS reading-card tests (packages/shared/src/markdown/parser.test.ts,
 * "reading cards (@read)"). Not in fixtures/parser-cases.json: that corpus is TS+Python and
 * the Python port is frozen.
 */
class MdParserReadTest {

    private val lesson = listOf(
        "# D",
        "",
        "## Basics",
        "",
        "@read",
        "**1. How a dot product measures similarity**",
        "A dot product multiplies matching entries and adds them up.",
        "",
        "- large and positive: the vectors point the same way",
        "- near zero: unrelated",
        "",
        "    indented code line",
        "",
    ).joinToString("\n")

    @Test fun `read tag turns the next card into a reading card`() {
        val card = MdParser.parse(lesson, "t.md").cards.single()
        assertEquals("read", card.type)
        assertEquals("How a dot product measures similarity", card.front)
        assertEquals("Basics", card.category)
        assertTrue(card.options.isEmpty())
        assertNull(card.sense)
        assertTrue(isReading(card))
        assertFalse(isDiagnostic(card))
    }

    @Test fun `the body keeps its lists, blank lines and indentation`() {
        val card = MdParser.parse(lesson, "t.md").cards.single()
        assertEquals(
            listOf(
                "A dot product multiplies matching entries and adds them up.",
                "",
                "- large and positive: the vectors point the same way",
                "- near zero: unrelated",
                "",
                "    indented code line",
            ).joinToString("\n"),
            card.back,
        )
    }

    @Test fun `trailing whitespace and surrounding blank lines are dropped`() {
        val text = "@read\n**1. T**\n\n\nbody   \n\n\n"
        assertEquals("body", MdParser.parse(text).cards[0].back)
    }

    @Test fun `the tag applies to one card only and neighbours stay basic and unchanged`() {
        val text = listOf(
            "**1. First**",
            "front side answer",
            "more of it",
            "",
            "@read",
            "**2. Lesson**",
            "Read me.",
            "**3. Last**",
            "another answer",
            "",
        ).joinToString("\n")
        val cards = MdParser.parse(text).cards
        assertEquals(listOf("basic", "read", "basic"), cards.map { it.type })
        assertEquals("front side answer more of it", cards[0].back)
        assertEquals("another answer", cards[2].back)
    }

    @Test fun `option-like and sense-like lines in a body are plain text`() {
        val text = listOf(
            "@read",
            "**1. Not a branch**",
            "- go left -> somewhere",
            "- a | b",
            "- c | d",
            "",
        ).joinToString("\n")
        val card = MdParser.parse(text).cards.single()
        assertEquals("read", card.type)
        assertTrue(card.options.isEmpty())
        assertNull(card.sense)
        assertFalse(card.senseConflict)
        assertEquals("- go left -> somewhere\n- a | b\n- c | d", card.back)
    }

    @Test fun `works with the Q front and keeps a label`() {
        val text = "[intro]\n@read\nQ: Why read first?\nBecause context helps.\n"
        val card = MdParser.parse(text).cards.single()
        assertEquals("read", card.type)
        assertEquals("intro", card.label)
        assertEquals("Why read first?", card.front)
        assertEquals("Because context helps.", card.back)
    }

    @Test fun `a heading still starts a new category and ends the body`() {
        val text = "@read\n**1. T**\nbody\n## Next\n**2. Q**\nans\n"
        val cards = MdParser.parse(text).cards
        assertEquals("body", cards[0].back)
        assertEquals("Next", cards[1].category)
        assertEquals("basic", cards[1].type)
    }

    @Test fun `a lone read tag with no card after it changes nothing`() {
        val text = "**1. A**\nans\n@read\n"
        assertEquals(listOf("basic"), MdParser.parse(text).cards.map { it.type })
    }
}
