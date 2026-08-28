package com.flashmd.data.speech

import android.content.Context
import android.speech.tts.TextToSpeech
import com.flashmd.domain.speech.SpeechResolver
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Platform TTS implementation.
 *
 * The engine initialises asynchronously, so calls made before it is ready are
 * dropped rather than queued: a card the learner has already moved past should
 * not start talking a second later. Nothing here throws — an unavailable
 * engine, a missing voice, or a dead binding all end as silence.
 */
@Singleton
class AndroidSpeechPlayer @Inject constructor(
    @ApplicationContext context: Context,
) : SpeechPlayer {

    @Volatile
    private var ready = false

    private val engine: TextToSpeech? = runCatching {
        TextToSpeech(context) { status -> ready = status == TextToSpeech.SUCCESS }
    }.getOrNull()

    /** Resolve a tag to a locale the engine accepts, trying the base language. */
    private fun localeFor(lang: String): Locale? {
        val tts = engine ?: return null
        if (!ready) return null
        val exact = Locale.forLanguageTag(lang)
        return when (tts.isLanguageAvailable(exact)) {
            TextToSpeech.LANG_AVAILABLE,
            TextToSpeech.LANG_COUNTRY_AVAILABLE,
            TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE,
            -> exact
            else -> {
                val base = Locale.forLanguageTag(SpeechResolver.baseLanguage(lang))
                if (tts.isLanguageAvailable(base) >= TextToSpeech.LANG_AVAILABLE) base else null
            }
        }
    }

    override fun speak(text: String, lang: String, rate: Double) {
        val tts = engine ?: return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        val locale = localeFor(lang) ?: return
        runCatching {
            // Stop first, always: two utterances overlapping is the defining
            // bug of a spoken flashcard app.
            tts.stop()
            tts.language = locale
            tts.setSpeechRate(SpeechResolver.clampRate(rate).toFloat())
            tts.speak(trimmed, TextToSpeech.QUEUE_FLUSH, null, trimmed.hashCode().toString())
        }
    }

    override fun stop() {
        runCatching { engine?.stop() }
    }

    override fun canSpeak(lang: String): Boolean = localeFor(lang) != null

    override fun needsVoiceData(lang: String): Boolean {
        val tts = engine ?: return false
        if (!ready) return false
        return runCatching {
            tts.isLanguageAvailable(Locale.forLanguageTag(lang)) ==
                TextToSpeech.LANG_MISSING_DATA
        }.getOrDefault(false)
    }

    override fun availableLanguages(): List<String> {
        val tts = engine ?: return emptyList()
        if (!ready) return emptyList()
        return runCatching {
            tts.availableLanguages
                .map { it.toLanguageTag() }
                .distinct()
                .sorted()
        }.getOrDefault(emptyList())
    }

    override fun shutdown() {
        runCatching { engine?.shutdown() }
    }
}
