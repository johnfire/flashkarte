package com.flashmd.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

enum class ThemeMode {
    SYSTEM,
    LIGHT,
    DARK;

    companion object {
        fun from(value: String?): ThemeMode =
            entries.firstOrNull { it.name == value } ?: SYSTEM
    }
}

private val Context.themeDataStore by preferencesDataStore(name = "flashkarte_prefs")

/** Persists the user's chosen theme mode (System / Light / Dark). */
@Singleton
class ThemeStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val themeKey = stringPreferencesKey("theme_mode")

    val mode: Flow<ThemeMode> =
        context.themeDataStore.data.map { ThemeMode.from(it[themeKey]) }

    suspend fun setMode(mode: ThemeMode) {
        context.themeDataStore.edit { it[themeKey] = mode.name }
    }
}
