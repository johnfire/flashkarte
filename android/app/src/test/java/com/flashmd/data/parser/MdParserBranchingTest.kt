package com.flashmd.data.parser

import org.junit.Assert.assertEquals
import org.junit.Test

class MdParserBranchingTest {
    private val md = """
        # Forest Path

        [start]
        **1. You reach a fork. Which way?**
        - Go left -> cave
        - Go right -> meadow

        [meadow]
        **2. A clearing.**
        You rest here.
    """.trimIndent()

    @Test fun parsesAnchorsAndOptions() {
        val deck = MdParser.parse(md)
        val start = deck.cards.first { it.label == "start" }
        assertEquals("branch", start.type)
        assertEquals("You reach a fork. Which way?", start.front)
        assertEquals(
            listOf(ParsedOption("Go left", "cave"), ParsedOption("Go right", "meadow")),
            start.options,
        )
    }

    @Test fun leafHasNoOptions() {
        val deck = MdParser.parse(md)
        val meadow = deck.cards.first { it.label == "meadow" }
        assertEquals("basic", meadow.type)
        assertEquals("You rest here.", meadow.back)
        assertEquals(emptyList<ParsedOption>(), meadow.options)
    }

    @Test fun backwardCompatible() {
        val deck = MdParser.parse("# Plain\n\n**1. Q**\nAn answer.\n")
        val c = deck.cards.single()
        assertEquals("basic", c.type)
        assertEquals(null, c.label)
        assertEquals(emptyList<ParsedOption>(), c.options)
    }
}
