package com.flashmd.data.speech

/**
 * Text-to-speech playback, behind an interface so ViewModels stay testable and
 * so a device with no engine is an ordinary case rather than a crash.
 *
 * Every method is fire-and-forget: speech must never gate revealing or rating a
 * card, so failures degrade to silence.
 */
interface SpeechPlayer {

    /** Speak one side, cancelling anything already speaking. */
    fun speak(text: String, lang: String, rate: Double)

    /** Stop immediately — called when advancing a card or leaving the screen. */
    fun stop()

    /**
     * Whether this device can speak [lang], allowing the base-language
     * fallback (a generic `de` voice serves a `de-DE` deck).
     */
    fun canSpeak(lang: String): Boolean

    /**
     * True when the engine recognises the language but its voice data is not
     * installed — the one case worth offering the user an action for.
     */
    fun needsVoiceData(lang: String): Boolean

    /**
     * Language tags this device can actually speak, for the settings pickers.
     *
     * Empty while the engine is still initialising or absent — callers must
     * treat that as "unknown", not as "no voices", and stay usable either way.
     */
    fun availableLanguages(): List<String>

    fun shutdown()
}
