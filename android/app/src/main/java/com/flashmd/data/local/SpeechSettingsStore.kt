package com.flashmd.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.flashmd.data.remote.dto.UserDto
import com.flashmd.domain.speech.SpeechResolver
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.speechDataStore by preferencesDataStore(name = "flashkarte_speech_prefs")

/**
 * Local mirror of the user's global speech defaults.
 *
 * The server owns these, but a study session must be able to resolve them
 * without a network round-trip — a language learner on a commute is the exact
 * case this feature exists for. Mirrored whenever a fresh [UserDto] arrives.
 */
@Singleton
class SpeechSettingsStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val enabledKey = booleanPreferencesKey("speech_enabled")
    private val langKey = stringPreferencesKey("speech_lang")
    private val autoplayKey = stringPreferencesKey("speech_autoplay")
    private val rateKey = doublePreferencesKey("speech_rate")
    private val uiLanguageKey = stringPreferencesKey("speech_ui_language")

    val defaults: Flow<SpeechResolver.UserDefaults> =
        context.speechDataStore.data.map { prefs ->
            SpeechResolver.UserDefaults(
                enabled = prefs[enabledKey] ?: false,
                lang = prefs[langKey],
                autoplay = prefs[autoplayKey] ?: SpeechResolver.DEFAULT_AUTOPLAY,
                rate = prefs[rateKey] ?: SpeechResolver.DEFAULT_RATE,
                uiLanguage = prefs[uiLanguageKey],
            )
        }

    suspend fun mirror(user: UserDto) {
        context.speechDataStore.edit { prefs ->
            prefs[enabledKey] = user.speechEnabled
            prefs[autoplayKey] = user.speechAutoplay
            prefs[rateKey] = user.speechRate
            user.speechLang?.let { prefs[langKey] = it } ?: prefs.remove(langKey)
            user.language?.let { prefs[uiLanguageKey] = it } ?: prefs.remove(uiLanguageKey)
        }
    }
}
