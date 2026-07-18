package com.flashmd.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Top-level auth gate. [isLoggedIn] is null until the first value resolves so
 * the UI can show a splash instead of flashing the login screen.
 */
@HiltViewModel
class SessionViewModel @Inject constructor(
    private val authRepo: AuthRepository,
) : ViewModel() {

    val isLoggedIn: StateFlow<Boolean?> = authRepo.isLoggedIn
        .map { it }
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _logoutError = MutableStateFlow<String?>(null)
    val logoutError: StateFlow<String?> = _logoutError.asStateFlow()

    fun logout() {
        viewModelScope.launch {
            try {
                authRepo.logout()
                _logoutError.value = null
            } catch (_: Exception) {
                _logoutError.value = "Couldn't log out. Please try again."
            }
        }
    }
}
