package com.flashmd.domain.speech

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

/**
 * Kotlin mirror of packages/shared/src/speech/resolve.ts — keep in sync.
 *
 * Two constituencies share one mechanism: language learners configure a deck
 * (front and back spoken in different voices), while read-aloud users flip one
 * global switch and configure nothing. Precedence between global defaults and
 * per-deck overrides is decided here and nowhere else — the study screen is a
 * thin renderer over the result (guardrails: shared-logic rule).
 *
 * Every case in SpeechResolverTest.kt has a twin in resolve.test.ts.
 */
object SpeechResolver {

    const val DEFAULT_AUTOPLAY = "back"
    const val DEFAULT_RATE = 1.0
    const val MIN_RATE = 0.5
    const val MAX_RATE = 2.0

    val AUTOPLAY_MODES = listOf("off", "front", "back", "both")

    /** The user's global defaults (`users.speech_*`). */
    data class UserDefaults(
        val enabled: Boolean = false,
        /** Preferred voice language, BCP-47. Null falls back to [uiLanguage]. */
        val lang: String? = null,
        val autoplay: String = DEFAULT_AUTOPLAY,
        val rate: Double = DEFAULT_RATE,
        /** `users.language` — the UI locale, the next fallback after [lang]. */
        val uiLanguage: String? = null,
    )

    /** A deck's overrides (`decks.speech_*`). Null means "inherit". */
    data class DeckOverrides(
        /** Tri-state: null inherit / true always on / false muted. */
        val enabled: Boolean? = null,
        val frontLang: String? = null,
        val backLang: String? = null,
        val autoplay: String? = null,
        val rate: Double? = null,
    )

    /**
     * The effective settings for one deck on this device.
     *
     * A non-null [frontLang]/[backLang] means that side *can* be spoken — the
     * manual replay button is offered for it. [autoplay] separately decides
     * whether it is spoken without being asked. Speech off entirely is both
     * languages null, so a caller that only checks the languages can never
     * accidentally speak.
     */
    data class Resolved(
        val frontLang: String?,
        val backLang: String?,
        val autoplay: String,
        val rate: Double,
    )

    private fun blankToNull(tag: String?): String? = tag?.trim()?.ifEmpty { null }

    /**
     * Clamp to the supported range and round to 2dp.
     *
     * The rounding is not cosmetic: Android once drifted from the server on
     * SM-2 easiness rounding alone, so every float crossing the port boundary
     * is pinned to a fixed precision.
     */
    fun clampRate(rate: Double?): Double {
        if (rate == null || rate.isNaN() || rate.isInfinite()) return DEFAULT_RATE
        val bounded = min(MAX_RATE, max(MIN_RATE, rate))
        return (bounded * 100).roundToLong() / 100.0
    }

    /**
     * The base language of a BCP-47 tag: `de-DE` → `de`.
     *
     * Used as the second attempt when no installed voice matches the exact tag,
     * so a device carrying only a generic `de` voice still speaks a `de-DE`
     * deck rather than falling silent.
     */
    fun baseLanguage(tag: String): String {
        val separator = tag.indexOfFirst { it == '-' || it == '_' }
        return if (separator == -1) tag else tag.substring(0, separator)
    }

    /**
     * Resolve global defaults + deck overrides into the settings for one deck.
     *
     * Precedence is one rule: **a non-null deck value wins over the user
     * value.** That single rule yields all four useful states of the on/off
     * control — inherit-off, inherit-on, forced-on (a configured language deck
     * while the global switch is off) and muted (one deck silenced while the
     * switch is on).
     */
    fun resolve(
        user: UserDefaults,
        deck: DeckOverrides,
        deviceLocale: String? = null,
    ): Resolved {
        val rate = clampRate(deck.rate ?: user.rate)
        val enabled = deck.enabled ?: user.enabled
        if (!enabled) {
            return Resolved(frontLang = null, backLang = null, autoplay = "off", rate = rate)
        }

        // The fallback chain is what makes a bare global switch useful: a user
        // who never opens a deck's settings still gets their own language,
        // while a configured deck keeps its own voices for that same user.
        val fallback = blankToNull(user.lang)
            ?: blankToNull(user.uiLanguage)
            ?: blankToNull(deviceLocale)

        return Resolved(
            frontLang = blankToNull(deck.frontLang) ?: fallback,
            backLang = blankToNull(deck.backLang) ?: fallback,
            autoplay = deck.autoplay ?: user.autoplay,
            rate = rate,
        )
    }

    /**
     * Whether one side should be spoken without the learner asking.
     *
     * Session mute is deliberately not an input: it is transient UI state, so
     * callers apply it on top rather than letting it reach stored settings.
     */
    fun shouldAutoplay(resolved: Resolved, side: String): Boolean {
        val lang = if (side == "front") resolved.frontLang else resolved.backLang
        if (lang == null) return false
        return resolved.autoplay == "both" || resolved.autoplay == side
    }
}
