package com.flashmd.data.repository

import com.flashmd.data.local.AuthCookieJar
import com.flashmd.data.local.SessionStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.CredentialsRequest
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: FlashkarteApi,
    private val sessionStore: SessionStore,
    private val cookieJar: AuthCookieJar,
) {
    val isLoggedIn: Flow<Boolean> = sessionStore.isLoggedIn
    val userEmail: Flow<String?> = sessionStore.userEmail

    suspend fun login(email: String, password: String) {
        val res = apiCall { api.login(CredentialsRequest(email.trim(), password)) }
        sessionStore.saveSession(res.accessToken, res.user)
    }

    suspend fun signup(email: String, password: String) {
        val res = apiCall { api.signup(CredentialsRequest(email.trim(), password)) }
        sessionStore.saveSession(res.accessToken, res.user)
    }

    suspend fun logout() {
        runCatching { api.logout() }
        sessionStore.clear()
        cookieJar.clear()
    }
}
