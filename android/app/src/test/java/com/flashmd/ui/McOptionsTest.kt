package com.flashmd.ui

import com.flashmd.ui.screens.study.McOptions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class McOptionsTest {
    @Test fun includesCorrectAndCapsCount() {
        val opts = McOptions.build("A", listOf("B", "C", "D", "E"), count = 4, random = Random(1))
        assertEquals(4, opts.size)
        assertTrue("A" in opts)
        assertEquals(opts.size, opts.toSet().size) // no duplicates
    }

    @Test fun excludesCorrectFromDistractorsAndDedupes() {
        val opts = McOptions.build("A", listOf("A", "A", "B", "B"), count = 4, random = Random(2))
        assertEquals(listOf("A", "B").sorted(), opts.sorted())
    }

    @Test fun emptyPoolReturnsOnlyCorrect() {
        assertEquals(listOf("A"), McOptions.build("A", emptyList(), random = Random(3)))
    }

    @Test fun smallPoolReturnsCorrectPlusAvailable() {
        val opts = McOptions.build("A", listOf("B"), count = 4, random = Random(4))
        assertEquals(listOf("A", "B").sorted(), opts.sorted())
    }
}
