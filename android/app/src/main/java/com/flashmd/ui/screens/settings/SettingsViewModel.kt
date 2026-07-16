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
    val isExporting: Boolean = false,
    val showDeleteDialog: Boolean = false,
    val deletePassword: String = "",
    val deleteConfirmText: String = "",
    val isDeletingAccount: Boolean = false,
    val deleteError: String? = null,
    // 2FA enrollment/disable flow. qrDataUrl non-null → pairing step is open;
    // backupCodes non-null → one-time reveal; showTwoFactorDisable → code
    // prompt for turning it off.
    val twoFactorQrDataUrl: String? = null,
    val twoFactorUri: String? = null,
    val twoFactorCode: String = "",
    val twoFactorBusy: Boolean = false,
    val twoFactorError: String? = null,
    val backupCodes: List<String>? = null,
    val showTwoFactorDisable: Boolean = false,
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

    /**
     * Fetch the account export and hand it to [write] (the screen supplies a
     * lambda that streams into the user-chosen SAF document). Keeping the file
     * IO out of the ViewModel keeps this fully unit-testable.
     */
    fun exportAccountData(write: suspend (String) -> Unit) {
        if (_state.value.isExporting) return
        _state.value = _state.value.copy(isExporting = true, error = null, message = null)
        viewModelScope.launch {
            try {
                val json = auth.exportAccountData()
                write(json)
                _state.value = _state.value.copy(isExporting = false, message = "Data exported")
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isExporting = false, error = e.message)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isExporting = false,
                    error = "Couldn't save the export file.",
                )
            }
        }
    }

    fun onTwoFactorCodeChange(v: String) {
        _state.value = _state.value.copy(twoFactorCode = v, twoFactorError = null)
    }

    fun cancelTwoFactorFlow() {
        if (_state.value.twoFactorBusy) return
        _state.value = _state.value.copy(
            twoFactorQrDataUrl = null,
            twoFactorUri = null,
            twoFactorCode = "",
            twoFactorError = null,
            backupCodes = null,
            showTwoFactorDisable = false,
        )
    }

    /** Begin enrollment: fetch the QR/URI pairing material. */
    fun startTwoFactorSetup() {
        if (_state.value.twoFactorBusy) return
        _state.value = _state.value.copy(twoFactorBusy = true, twoFactorError = null)
        viewModelScope.launch {
            try {
                val setup = auth.twoFactorSetup()
                _state.value = _state.value.copy(
                    twoFactorBusy = false,
                    twoFactorQrDataUrl = setup.qrDataUrl,
                    twoFactorUri = setup.otpauthUri,
                    twoFactorCode = "",
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(twoFactorBusy = false, twoFactorError = e.message)
            }
        }
    }

    /** Verify the pairing code; on success show the one-time backup codes. */
    fun confirmTwoFactorEnable() {
        val s = _state.value
        if (s.twoFactorBusy || s.twoFactorCode.isBlank()) return
        _state.value = s.copy(twoFactorBusy = true, twoFactorError = null)
        viewModelScope.launch {
            try {
                val codes = auth.twoFactorEnable(s.twoFactorCode)
                _state.value = _state.value.copy(
                    twoFactorBusy = false,
                    twoFactorQrDataUrl = null,
                    twoFactorUri = null,
                    twoFactorCode = "",
                    backupCodes = codes,
                    user = _state.value.user?.copy(twoFactorEnabled = true),
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(twoFactorBusy = false, twoFactorError = e.message)
            }
        }
    }

    fun openTwoFactorDisable() {
        _state.value = _state.value.copy(
            showTwoFactorDisable = true,
            twoFactorCode = "",
            twoFactorError = null,
        )
    }

    fun confirmTwoFactorDisable() {
        val s = _state.value
        if (s.twoFactorBusy || s.twoFactorCode.isBlank()) return
        _state.value = s.copy(twoFactorBusy = true, twoFactorError = null)
        viewModelScope.launch {
            try {
                auth.twoFactorDisable(s.twoFactorCode)
                _state.value = _state.value.copy(
                    twoFactorBusy = false,
                    showTwoFactorDisable = false,
                    twoFactorCode = "",
                    user = _state.value.user?.copy(twoFactorEnabled = false),
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(twoFactorBusy = false, twoFactorError = e.message)
            }
        }
    }

    fun dismissBackupCodes() {
        _state.value = _state.value.copy(backupCodes = null)
    }

    fun openDeleteDialog() {
        _state.value = _state.value.copy(
            showDeleteDialog = true,
            deletePassword = "",
            deleteConfirmText = "",
            deleteError = null,
        )
    }

    fun closeDeleteDialog() {
        if (_state.value.isDeletingAccount) return
        _state.value = _state.value.copy(
            showDeleteDialog = false,
            deletePassword = "",
            deleteConfirmText = "",
            deleteError = null,
        )
    }

    fun onDeletePasswordChange(v: String) {
        _state.value = _state.value.copy(deletePassword = v, deleteError = null)
    }

    fun onDeleteConfirmTextChange(v: String) {
        _state.value = _state.value.copy(deleteConfirmText = v, deleteError = null)
    }

    /**
     * Permanently delete the account. Two-step confirmation: the user must
     * type DELETE and re-enter their password (verified server-side). On
     * success the repository wipes all local data and clears the session,
     * which navigates back to the auth screen on its own.
     */
    fun deleteAccount() {
        val s = _state.value
        if (s.isDeletingAccount) return
        if (s.deleteConfirmText != "DELETE") {
            _state.value = s.copy(deleteError = "Type DELETE to confirm.")
            return
        }
        _state.value = s.copy(isDeletingAccount = true, deleteError = null)
        viewModelScope.launch {
            try {
                auth.deleteAccount(s.deletePassword)
                // No state update needed: the cleared session unmounts settings.
            } catch (e: ApiException) {
                _state.value = _state.value.copy(
                    isDeletingAccount = false,
                    deleteError = e.message,
                )
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
