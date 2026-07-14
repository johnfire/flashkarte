package com.flashmd.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.UserDto
import com.flashmd.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val user: UserDto? = null,
    val displayNameDraft: String = "",
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isChangingPassword: Boolean = false,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val user = auth.getMe()
                _state.value = _state.value.copy(
                    user = user, displayNameDraft = user.displayName ?: "", isLoading = false,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun onDisplayNameChange(v: String) {
        _state.value = _state.value.copy(displayNameDraft = v.take(60), message = null)
    }

    fun saveDisplayName() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSaving = true, error = null, message = null)
            try {
                val user = auth.updateProfile(_state.value.displayNameDraft)
                _state.value = _state.value.copy(user = user, isSaving = false, message = "Saved")
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isSaving = false, error = e.message)
            }
        }
    }

    fun resendVerification() {
        viewModelScope.launch {
            try {
                auth.resendVerification()
                _state.value = _state.value.copy(message = "Verification email sent")
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }

    fun onCurrentPasswordChange(v: String) {
        _state.value = _state.value.copy(currentPassword = v, message = null, error = null)
    }

    fun onNewPasswordChange(v: String) {
        _state.value = _state.value.copy(newPassword = v, message = null, error = null)
    }

    fun onConfirmPasswordChange(v: String) {
        _state.value = _state.value.copy(confirmPassword = v, message = null, error = null)
    }

    /** Change the password in-app (user knows their current one). */
    fun submitPasswordChange() {
        val s = _state.value
        if (s.isChangingPassword) return
        if (s.newPassword.length < 8) {
            _state.value = s.copy(error = "New password must be at least 8 characters.")
            return
        }
        if (s.newPassword != s.confirmPassword) {
            _state.value = s.copy(error = "The new passwords don't match.")
            return
        }
        _state.value = s.copy(isChangingPassword = true, error = null, message = null)
        viewModelScope.launch {
            try {
                auth.changePassword(s.currentPassword, s.newPassword)
                _state.value = _state.value.copy(
                    isChangingPassword = false,
                    currentPassword = "",
                    newPassword = "",
                    confirmPassword = "",
                    message = "Password updated. Other devices have been signed out.",
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isChangingPassword = false, error = e.message)
            }
        }
    }

    /** Email a reset link — for when the user can't remember their password. */
    fun sendResetEmail() {
        val email = _state.value.user?.email ?: return
        viewModelScope.launch {
            try {
                auth.forgotPassword(email)
                _state.value = _state.value.copy(message = "Password reset email sent")
            } catch (e: ApiException) {
                _state.value = _state.value.copy(error = e.message)
            }
        }
    }
}
