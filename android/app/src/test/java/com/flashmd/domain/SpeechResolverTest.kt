package com.flashmd.domain

import com.flashmd.domain.speech.SpeechResolver
import com.flashmd.domain.speech.SpeechResolver.DeckOverrides
import com.flashmd.domain.speech.SpeechResolver.UserDefaults
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

// Mirror of packages/shared/src/speech/resolve.test.ts — every case below has a
// twin there. Resolution is deterministic, so the ports must agree exactly.
class SpeechResolverTest {

    // --- on/off truth table ---

    @Test
    fun `inherits off - silent when neither is set`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = false),
            DeckOverrides(enabled = null),
        )
        assertNull(r.frontLang)
        assertNull(r.backLang)
        assertEquals("off", r.autoplay)
        assertEquals(1.0, r.rate, 0.0)
    }

    @Test
    fun `inherits on - the read-aloud user gets every deck spoken, unconfigured`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = true, uiLanguage = "de"),
            DeckOverrides(enabled = null),
        )
        assertEquals("de", r.frontLang)
        assertEquals("de", r.backLang)
    }

    @Test
    fun `deck on overrides the global switch being off`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = false),
            DeckOverrides(enabled = true, frontLang = "de-DE", backLang = "en-GB"),
        )
        assertEquals("de-DE", r.frontLang)
        assertEquals("en-GB", r.backLang)
    }

    @Test
    fun `deck off mutes one deck while the global switch stays on`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = true, lang = "en"),
            DeckOverrides(enabled = false, frontLang = "de-DE"),
        )
        assertNull(r.frontLang)
        assertNull(r.backLang)
        assertEquals("off", r.autoplay)
    }

    // --- language fallback chain ---

    @Test
    fun `prefers the deck language over every global value`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = true, lang = "en-US", uiLanguage = "en"),
            DeckOverrides(frontLang = "es-ES", backLang = "es-ES"),
        )
        assertEquals("es-ES", r.frontLang)
    }

    @Test
    fun `falls back deck then user lang then ui language then device locale`() {
        assertEquals(
            "fr-FR",
            SpeechResolver.resolve(
                UserDefaults(enabled = true, lang = "fr-FR", uiLanguage = "de"),
                DeckOverrides(),
                "en-US",
            ).backLang,
        )
        assertEquals(
            "de",
            SpeechResolver.resolve(
                UserDefaults(enabled = true, uiLanguage = "de"),
                DeckOverrides(),
                "en-US",
            ).backLang,
        )
        assertEquals(
            "en-US",
            SpeechResolver.resolve(UserDefaults(enabled = true), DeckOverrides(), "en-US").backLang,
        )
        assertNull(
            SpeechResolver.resolve(UserDefaults(enabled = true), DeckOverrides(), null).backLang,
        )
    }

    @Test
    fun `treats blank strings as unset rather than as a language`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = true, lang = "  ", uiLanguage = "de"),
            DeckOverrides(frontLang = "", backLang = "   "),
        )
        assertEquals("de", r.frontLang)
        assertEquals("de", r.backLang)
    }

    @Test
    fun `speaks only the configured side when the other has no fallback`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = true),
            DeckOverrides(frontLang = "ja-JP"),
            null,
        )
        assertEquals("ja-JP", r.frontLang)
        assertNull(r.backLang)
    }

    // --- autoplay and rate ---

    @Test
    fun `takes the deck autoplay over the user default`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = true, uiLanguage = "de", autoplay = "back"),
            DeckOverrides(autoplay = "front"),
        )
        assertEquals("front", r.autoplay)
    }

    @Test
    fun `keeps the resolved rate even when speech is off`() {
        val r = SpeechResolver.resolve(
            UserDefaults(enabled = false, rate = 0.8),
            DeckOverrides(),
        )
        assertEquals(0.8, r.rate, 0.0)
    }

    @Test
    fun `clamps and rounds the rate to 2dp for port parity`() {
        assertEquals(0.5, SpeechResolver.clampRate(0.1), 0.0)
        assertEquals(2.0, SpeechResolver.clampRate(9.0), 0.0)
        assertEquals(0.83, SpeechResolver.clampRate(0.8333333), 0.0)
        assertEquals(1.0, SpeechResolver.clampRate(null), 0.0)
        assertEquals(1.0, SpeechResolver.clampRate(Double.NaN), 0.0)
    }

    // --- shouldAutoplay ---

    private val spoken = SpeechResolver.resolve(
        UserDefaults(enabled = true),
        DeckOverrides(frontLang = "de-DE", backLang = "en-GB", autoplay = "back"),
    )

    @Test
    fun `plays only the named side`() {
        assertTrue(SpeechResolver.shouldAutoplay(spoken, "back"))
        assertFalse(SpeechResolver.shouldAutoplay(spoken, "front"))
    }

    @Test
    fun `plays both sides on both and neither on off`() {
        val both = spoken.copy(autoplay = "both")
        assertTrue(SpeechResolver.shouldAutoplay(both, "front"))
        assertTrue(SpeechResolver.shouldAutoplay(both, "back"))
        assertFalse(SpeechResolver.shouldAutoplay(spoken.copy(autoplay = "off"), "back"))
    }

    @Test
    fun `never plays a side with no resolved language`() {
        val noBack = spoken.copy(autoplay = "both", backLang = null)
        assertFalse(SpeechResolver.shouldAutoplay(noBack, "back"))
    }

    @Test
    fun `base language strips the region so a generic voice can still be found`() {
        assertEquals("de", SpeechResolver.baseLanguage("de-DE"))
        assertEquals("pt", SpeechResolver.baseLanguage("pt_BR"))
        assertEquals("de", SpeechResolver.baseLanguage("de"))
    }
}
