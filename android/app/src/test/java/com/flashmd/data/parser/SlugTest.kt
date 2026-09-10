package com.flashmd.data.parser

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Parity contract with packages/shared/src/slug.ts. Expected values were produced by
 * running the TS implementation, not by reading it — the polysemy `word` key is computed
 * on both sides, so a divergence here would silently stop a word's senses grouping on
 * Android only.
 */
class SlugTest {
    @Test fun `matches the TS implementation`() {
        assertEquals("der-zug", slugify("der Zug"))
        assertEquals("die-bank", slugify("die Bank"))
        assertEquals("hauser", slugify("Häuser"))
        assertEquals("el-nino", slugify("el niño"))
        assertEquals("etre", slugify("être"))
        assertEquals("aou", slugify("ÄÖÜ"))
        assertEquals("zug-bahn", slugify("Zug  --  Bahn"))
    }

    @Test fun `eszett has no decomposition and becomes a separator`() {
        // Not a diacritic, so NFKD leaves it and the a-z filter turns it into "-".
        assertEquals("stra-e", slugify("Straße"))
    }

    @Test fun `empty and punctuation-only input fall back`() {
        assertEquals("deck", slugify("   "))
        assertEquals("deck", slugify("!!!"))
    }

    @Test fun `truncates to 60 characters`() {
        assertEquals("a".repeat(60), slugify("a".repeat(70)))
    }
}
