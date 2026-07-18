package com.flashmd.ui.theme

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.local.ThemeMode
import com.flashmd.data.local.ThemeStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ThemeViewModel @Inject constructor(
    private val store: ThemeStore,
) : ViewModel() {

    val mode: StateFlow<ThemeMode> =
        store.mode.stateIn(viewModelScope, SharingStarted.Eagerly, ThemeMode.SYSTEM)

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun set(mode: ThemeMode) {
        persistMode(mode)
    }

    /** Cycle System → Light → Dark → System. */
    fun cycle() {
        val nextMode = when (mode.value) {
            ThemeMode.SYSTEM -> ThemeMode.LIGHT
            ThemeMode.LIGHT -> ThemeMode.DARK
            ThemeMode.DARK -> ThemeMode.SYSTEM
        }
        persistMode(nextMode)
    }

    private fun persistMode(mode: ThemeMode) {
        viewModelScope.launch {
            try {
                store.setMode(mode)
                _error.value = null
            } catch (_: Exception) {
                _error.value = "Couldn't save the appearance setting."
            }
        }
    }
}
