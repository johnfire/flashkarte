package com.flashmd.data.repository

import com.flashmd.data.local.AuthCookieJar
import com.flashmd.data.local.SessionStore
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.ChangePasswordRequest
import com.flashmd.data.remote.dto.CredentialsRequest
import com.flashmd.data.remote.dto.DeleteAccountRequest
import com.flashmd.data.remote.dto.ForgotPasswordRequest
import com.flashmd.data.remote.dto.TwoFactorCodeRequest
import com.flashmd.data.remote.dto.TwoFactorLoginRequest
import com.flashmd.data.remote.dto.TwoFactorSetupResponse
import com.flashmd.data.remote.dto.UpdateProfileRequest
import com.flashmd.data.remote.dto.UserDto
import com.flashmd.db.FlashkarteDb
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: FlashkarteApi,
    private val sessionStore: SessionStore,
    private val cookieJar: AuthCookieJar,
    private val db: FlashkarteDb,
) {
    val isLoggedIn: Flow<Boolean> = sessionStore.isLoggedIn
    val userEmail: Flow<String?> = sessionStore.userEmail

    /** Result of the password step: either signed in, or 2FA code needed. */
    sealed interface LoginOutcome {
        data object Success : LoginOutcome
        data class NeedsTwoFactor(val challenge: String) : LoginOutcome
    }

    // Mobile apps don't prompt "remember me" the way a browser tab does —
    // signing in here always starts a persistent, sliding-window session
    // (see REFRESH_TOKEN_TTL_DAYS server-side).
    suspend fun login(email: String, password: String): LoginOutcome {
        val res = apiCall {
            api.login(CredentialsRequest(email.trim(), password, rememberMe = true))
        }
        if (res.requiresTwoFactor && res.challenge != null) {
            return LoginOutcome.NeedsTwoFactor(res.challenge)
        }
        val user = res.user
        val token = res.accessToken
        if (user == null || token == null) {
            throw ApiException(status = 0, code = "BAD_RESPONSE", message = "Malformed login response")
        }
        sessionStore.saveSession(token, user)
        return LoginOutcome.Success
    }

    /** Second step of a 2FA login: exchange challenge + code for the session. */
    suspend fun completeTwoFactorLogin(challenge: String, code: String) {
        val res = apiCall {
            api.twoFactorLogin(TwoFactorLoginRequest(challenge, code.trim(), rememberMe = true))
        }
        sessionStore.saveSession(res.accessToken, res.user)
    }

    suspend fun twoFactorSetup(): TwoFactorSetupResponse =
        apiCall { api.twoFactorSetup() }

    /** Verify the pairing code; returns the one-time backup codes. */
    suspend fun twoFactorEnable(code: String): List<String> =
        apiCall { api.twoFactorEnable(TwoFactorCodeRequest(code.trim())) }.backupCodes

    suspend fun twoFactorDisable(code: String) {
        apiCall { api.twoFactorDisable(TwoFactorCodeRequest(code.trim())) }
    }

    suspend fun signup(email: String, password: String) {
        val res = apiCall {
            api.signup(CredentialsRequest(email.trim(), password, rememberMe = true))
        }
        sessionStore.saveSession(res.accessToken, res.user)
    }

    suspend fun logout() {
        runCatching { api.logout() }
        sessionStore.clear()
        cookieJar.clear()
    }

    suspend fun getMe(): UserDto = apiCall { api.getMe() }.user

    suspend fun updateProfile(displayName: String): UserDto =
        apiCall { api.updateMe(UpdateProfileRequest(displayName.trim())) }.user

    suspend fun resendVerification() {
        apiCall { api.resendVerification() }
    }

    suspend fun forgotPassword(email: String) {
        apiCall { api.forgotPassword(ForgotPasswordRequest(email.trim())) }
    }

    /**
     * Change the password of the signed-in user. The server rotates the
     * session, so persist the fresh access token to keep this device logged in.
     */
    suspend fun changePassword(currentPassword: String, newPassword: String) {
        val res = apiCall {
            api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
        }
        sessionStore.saveSession(res.accessToken, res.user)
    }

    /** Fetch the full account export (§13.3 data portability) as raw JSON. */
    suspend fun exportAccountData(): String =
        apiCall { api.exportAccountData() }.string()

    /**
     * Permanently delete the account server-side, then wipe everything this
     * device knows about the user: cached decks/cards/progress, the unsynced
     * review outbox, the session, and the refresh cookie. A re-created account
     * must never see stale local data. Clearing the session flips [isLoggedIn],
     * which sends the UI back to the auth screen.
     */
    suspend fun deleteAccount(currentPassword: String) {
        apiCall { api.deleteAccount(DeleteAccountRequest(currentPassword)) }
        db.transaction {
            db.outboxQueries.deleteAllOutbox()
            db.cardProgressQueries.deleteAllProgress()
            db.cardsQueries.deleteAllCards()
            db.decksQueries.deleteAllDecks()
        }
        sessionStore.clear()
        cookieJar.clear()
    }
}
