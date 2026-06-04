package com.flashmd.parser

import com.flashmd.data.parser.MdParser
import org.junit.Assert.*
import org.junit.Test

private val SAMPLE = """
# Test Deck
*subtitle*

---

## Category One

**1. ALPHA — Alpha Particle**
The first letter of the Greek alphabet.
Used in physics to describe helium nuclei.

**2. BETA — Beta Particle**
An electron or positron emitted during beta decay.

## Category Two

**3. GAMMA — Gamma Ray**
High-energy electromagnetic radiation.

This is a second paragraph.
""".trimIndent()

class MdParserTest {

    @Test fun `deck title parsed`() {
        assertEquals("Test Deck", MdParser.parse(SAMPLE, "t.md").title)
    }

    @Test fun `card count`() {
        assertEquals(3, MdParser.parse(SAMPLE).cards.size)
    }

    @Test fun `card fronts stripped of numbering`() {
        val cards = MdParser.parse(SAMPLE).cards
        assertEquals("ALPHA — Alpha Particle", cards[0].front)
        assertEquals("BETA — Beta Particle", cards[1].front)
        assertEquals("GAMMA — Gamma Ray", cards[2].front)
    }

    @Test fun `categories assigned`() {
        val cards = MdParser.parse(SAMPLE).cards
        assertEquals("Category One", cards[0].category)
        assertEquals("Category One", cards[1].category)
        assertEquals("Category Two", cards[2].category)
    }

    @Test fun `multi-line single paragraph joined with space`() {
        val back = MdParser.parse(SAMPLE).cards[0].back
        assertEquals(
            "The first letter of the Greek alphabet. Used in physics to describe helium nuclei.",
            back
        )
    }

    @Test fun `single line back`() {
        val back = MdParser.parse(SAMPLE).cards[1].back
        assertEquals("An electron or positron emitted during beta decay.", back)
    }

    @Test fun `multi-paragraph back uses double newline`() {
        val back = MdParser.parse(SAMPLE).cards[2].back
        assertTrue(back.contains("\n\n"))
        val parts = back.split("\n\n")
        assertEquals("High-energy electromagnetic radiation.", parts[0])
        assertEquals("This is a second paragraph.", parts[1])
    }

    @Test fun `empty deck returns empty card list`() {
        val deck = MdParser.parse("# Empty\nNo cards here.")
        assertEquals(0, deck.cards.size)
    }

    @Test fun `no title falls back to sourceFile`() {
        val deck = MdParser.parse("**1. FOO — Bar**\nDef.", "fallback.md")
        assertEquals("fallback.md", deck.title)
    }
}
