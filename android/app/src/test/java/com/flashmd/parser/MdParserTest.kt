package com.flashmd.parser

import com.flashmd.data.parser.MdParser
import com.flashmd.data.parser.ParsedOption
import com.flashmd.data.parser.isDiagnostic
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

    @Test fun `Q and A format parses fronts`() {
        val deck = MdParser.parse(QA_SAMPLE, "ai.md")
        assertEquals("AI Terms", deck.title)
        assertEquals(listOf("AI", "ML"), deck.cards.map { it.front })
    }

    @Test fun `Q and A answer and description split into paragraphs`() {
        val back = MdParser.parse(QA_SAMPLE).cards[0].back
        assertEquals(
            listOf(
                "Artificial Intelligence",
                "The field of building systems that perform tasks normally requiring human intelligence."
            ),
            back.split("\n\n")
        )
    }

    @Test fun `Q and A without description yields just the answer`() {
        val deck = MdParser.parse("# D\n\nQ: HP\nA: Horsepower\n")
        assertEquals(1, deck.cards.size)
        assertEquals("Horsepower", deck.cards[0].back)
    }

    @Test fun `A colon line in bold format is preserved as back text`() {
        val deck = MdParser.parse("# D\n\n**1. FOO**\nA: this is just back text.\n")
        assertEquals("A: this is just back text.", deck.cards[0].back)
    }

    // Spec 01 — parity with packages/shared parser.test.ts ("diagnostic cards").
    @Test fun `card with a correct option is basic and keeps back text`() {
        val md = "# Biology\n\n[dx]\n" +
            "**14. A cell divides producing four haploid cells. This is:**\n" +
            "- Meiosis -> correct\n- Mitosis -> confusion-mitosis\n- Binary fission -> end\n" +
            "Meiosis: gametes, variety, halved chromosomes.\n"
        val card = MdParser.parse(md).cards.first { it.label == "dx" }
        assertEquals("basic", card.type)
        assertEquals("A cell divides producing four haploid cells. This is:", card.front)
        assertEquals("Meiosis: gametes, variety, halved chromosomes.", card.back)
        assertEquals(
            listOf(
                ParsedOption("Meiosis", "correct"),
                ParsedOption("Mitosis", "confusion-mitosis"),
                ParsedOption("Binary fission", "end"),
            ),
            card.options,
        )
        assertTrue(isDiagnostic(card))
    }

    @Test fun `card with options but no correct target stays a branch card`() {
        val deck = MdParser.parse("# T\n\n[q]\n**1. Fork?**\n- Left -> a\n- Right -> b\n")
        val card = deck.cards[0]
        assertEquals("branch", card.type)
        assertEquals("", card.back)
        assertFalse(isDiagnostic(card))
    }

    @Test fun `deck mixes SR, diagnostic and remediation cards`() {
        val md = "# Mixed\n\n**1. Plain front**\nPlain back.\n\n" +
            "[dx]\n**2. Pick one:**\n- Right -> correct\n- Wrong -> fix\nExplanation back.\n\n" +
            "[fix]\n**3. Remediation**\nThe fix.\n"
        val deck = MdParser.parse(md)
        assertEquals(listOf("basic", "basic", "basic"), deck.cards.map { it.type })
        assertEquals(listOf(false, true, false), deck.cards.map { isDiagnostic(it) })
        assertEquals("Plain back.", deck.cards[0].back)
        assertEquals("Explanation back.", deck.cards[1].back)
    }
}

private val QA_SAMPLE = """
# AI Terms

Q: AI
A: Artificial Intelligence
The field of building systems that perform tasks normally requiring human intelligence.

Q: ML
A: Machine Learning
A subfield of AI in which systems learn patterns from data.
""".trimIndent()
