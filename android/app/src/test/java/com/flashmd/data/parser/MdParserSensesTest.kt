package com.flashmd.data.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Parity with the TS word-block tests (packages/shared/src/markdown/parser.test.ts).
 * Sense lines are not in fixtures/parser-cases.json because that corpus is TS+Python and
 * the Python port is frozen — same reason branching parity lives in these suites.
 */
class MdParserSensesTest {

    private val zug = listOf(
        "# D",
        "",
        "## Nouns",
        "",
        "**1. der Zug**",
        "- train | Der Zug fährt um 8 Uhr ab. | Eisenbahn",
        "- move | Das war ein guter Zug! | Schach",
        "- draught | Es zieht. | Luft",
        "",
    ).joinToString("\n")

    @Test fun `one block becomes one card per sense`() {
        val cards = MdParser.parse(zug, "t.md").cards
        assertEquals(3, cards.size)
        assertEquals(listOf("der Zug", "der Zug", "der Zug"), cards.map { it.front })
        assertEquals(listOf("train", "move", "draught"), cards.map { it.back })
        assertEquals(listOf("Nouns", "Nouns", "Nouns"), cards.map { it.category })
        assertEquals(listOf(0, 1, 2), cards.map { it.sense?.index })
        assertTrue(cards.all { it.sense?.count == 3 })
        assertTrue(cards.all { it.sense?.word == "der-zug" })
        assertEquals("Der Zug fährt um 8 Uhr ab.", cards[0].sense?.context)
        assertEquals("Eisenbahn", cards[0].sense?.hint)
    }

    @Test fun `context and hint are optional but the pipe marks the line`() {
        val bullets = MdParser.parse("# D\n\n**1. W**\n- a\n- b | ctx\n", "t.md").cards
        assertEquals(1, bullets.size)
        assertNull(bullets[0].sense)

        val ok = MdParser.parse("# D\n\n**1. W**\n- a |\n- b | ctx\n", "t.md").cards
        assertEquals(2, ok.size)
        assertNull(ok[0].sense?.context)
        assertNull(ok[0].sense?.hint)
        assertEquals("ctx", ok[1].sense?.context)
        assertNull(ok[1].sense?.hint)
    }

    @Test fun `only the first two pipes split, the rest belong to the hint`() {
        val cards = MdParser.parse("# D\n\n**1. W**\n- g | c | h | extra\n- g2 | c2\n", "t.md").cards
        assertEquals("c", cards[0].sense?.context)
        assertEquals("h | extra", cards[0].sense?.hint)
    }

    @Test fun `a single sense line stays an ordinary card`() {
        val cards = MdParser.parse("# D\n\n**1. W**\n- only | ctx | hint\n", "t.md").cards
        assertEquals(1, cards.size)
        assertNull(cards[0].sense)
        assertEquals("- only | ctx | hint", cards[0].back)
    }

    @Test fun `a back that is not entirely sense lines is left alone`() {
        val cards = MdParser.parse("# D\n\n**1. W**\nIntro prose.\n- a | b\n- c | d\n", "t.md").cards
        assertEquals(1, cards.size)
        assertNull(cards[0].sense)
        assertEquals("Intro prose. - a | b - c | d", cards[0].back)
    }

    @Test fun `an empty gloss disqualifies the line`() {
        val cards = MdParser.parse("# D\n\n**1. W**\n- | ctx\n- b | ctx\n", "t.md").cards
        assertEquals(1, cards.size)
        assertNull(cards[0].sense)
    }

    @Test fun `options win over sense lines and the conflict is flagged`() {
        val md = listOf(
            "# D", "", "**1. W**",
            "- train | ctx | hint",
            "- move | ctx2 | hint2",
            "- Right -> correct",
            "",
        ).joinToString("\n")
        val cards = MdParser.parse(md, "t.md").cards
        assertEquals(1, cards.size)
        assertNull(cards[0].sense)
        assertTrue(cards[0].senseConflict)
        assertEquals(1, cards[0].options.size)
    }

    @Test fun `ordinary cards carry no sense and no conflict`() {
        val cards = MdParser.parse("# D\n\n**1. X**\nplain.\n", "t.md").cards
        assertNull(cards[0].sense)
        assertTrue(!cards[0].senseConflict)
    }
}
