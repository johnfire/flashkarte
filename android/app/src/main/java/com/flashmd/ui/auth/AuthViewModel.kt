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
    val info: String? = null,
    // Non-null while the server waits for the second factor of a 2FA login.
    val twoFactorChallenge: String? = null,
    val twoFactorCode: String = "",
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepo: AuthRepository,
    private val errorReporter: ErrorReporter,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState

    fun onEmailChange(value: String) {
        _uiState.value = _uiState.value.copy(email = value, error = null, info = null)
    }

    fun onPasswordChange(value: String) {
        _uiState.value = _uiState.value.copy(password = value, error = null, info = null)
    }

    fun toggleMode() {
        _uiState.value = _uiState.value.copy(
            isSignup = !_uiState.value.isSignup,
            error = null,
            info = null,
        )
    }

    /**
     * Send a password-reset email — for when the user can't remember their
     * password and so can't sign in. Uses the email already typed above.
     */
    fun forgotPassword() {
        val state = _uiState.value
        if (state.isSubmitting) return
        val email = state.email.trim()
        if (email.isEmpty() || !email.contains("@")) {
            _uiState.value = state.copy(
                error = "Enter your email above, then tap “Forgot password?”.",
                info = null,
            )
            return
        }
        _uiState.value = state.copy(isSubmitting = true, error = null, info = null)
        viewModelScope.launch {
            try {
                authRepo.forgotPassword(email)
            } catch (_: Exception) {
                // Deliberately ignore failures: the server responds the same way
                // whether or not the email exists (no account enumeration), so
                // we show the same reassuring message regardless.
            } finally {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    info = "If that email has an account, a reset link is on its way.",
                )
            }
        }
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

        _uiState.value = state.copy(isSubmitting = true, error = null, info = null)
        viewModelScope.launch {
            try {
                if (state.isSignup) {
                    authRepo.signup(email, state.password)
                } else {
                    val outcome = authRepo.login(email, state.password)
                    if (outcome is AuthRepository.LoginOutcome.NeedsTwoFactor) {
                        _uiState.value = _uiState.value.copy(
                            isSubmitting = false,
                            twoFactorChallenge = outcome.challenge,
                            twoFactorCode = "",
                        )
                        return@launch
                    }
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

    fun onTwoFactorCodeChange(value: String) {
        _uiState.value = _uiState.value.copy(twoFactorCode = value, error = null)
    }

    fun cancelTwoFactor() {
        _uiState.value = _uiState.value.copy(
            twoFactorChallenge = null,
            twoFactorCode = "",
            error = null,
        )
    }

    /** Submit the TOTP/backup code for the pending 2FA login challenge. */
    fun submitTwoFactor() {
        val state = _uiState.value
        val challenge = state.twoFactorChallenge ?: return
        if (state.isSubmitting || state.twoFactorCode.isBlank()) return
        _uiState.value = state.copy(isSubmitting = true, error = null)
        viewModelScope.launch {
            try {
                authRepo.completeTwoFactorLogin(challenge, state.twoFactorCode)
                // Session flow flips; the gate swaps screens.
            } catch (e: ApiException) {
                _uiState.value = _uiState.value.copy(isSubmitting = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "2fa failed", "Auth.submitTwoFactor", e)
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    error = "Something went wrong. Please try again.",
                )
            }
        }
    }
}
