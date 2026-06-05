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

enum class StudyMode {
    FLIP,
    CHOICE;

    companion object {
        fun from(value: String?): StudyMode = entries.firstOrNull { it.name == value } ?: FLIP
    }
}

private val Context.studyDataStore by preferencesDataStore(name = "flashkarte_study_prefs")

@Singleton
class StudyModeStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val key = stringPreferencesKey("study_mode")

    val mode: Flow<StudyMode> = context.studyDataStore.data.map { StudyMode.from(it[key]) }

    suspend fun setMode(mode: StudyMode) {
        context.studyDataStore.edit { it[key] = mode.name }
    }
}
