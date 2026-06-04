package com.flashmd.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val isSignup: Boolean = false,
    val isSubmitting: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepo: AuthRepository,
    private val errorReporter: ErrorReporter,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, error = null)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, error = null)
    }

    fun toggleMode() {
        _uiState.value = _uiState.value.copy(
            isSignup = !_uiState.value.isSignup,
            error = null,
        )
    }

    fun submit() {
        val state = _uiState.value
        if (state.isSubmitting) return

        val email = state.email.trim()
        if (email.isEmpty() || !email.contains("@")) {
            _uiState.value = state.copy(error = "Enter a valid email address.")
            return
        }
        if (state.password.length < 8) {
            _uiState.value = state.copy(error = "Password must be at least 8 characters.")
            return
        }

        _uiState.value = state.copy(isSubmitting = true, error = null)
        viewModelScope.launch {
            try {
                if (state.isSignup) {
                    authRepo.signup(email, state.password)
                } else {
                    authRepo.login(email, state.password)
                }
                // On success the session flow flips and the gate swaps screens.
            } catch (e: ApiException) {
                _uiState.value = _uiState.value.copy(isSubmitting = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "auth failed", "Auth.submit", e)
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    error = "Something went wrong. Please try again.",
                )
            }
        }
    }
}
