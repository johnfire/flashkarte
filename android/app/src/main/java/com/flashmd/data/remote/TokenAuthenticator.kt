package com.flashmd.data.remote

import com.flashmd.BuildConfig
import com.flashmd.data.local.SessionStore
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

/**
 * On a 401, transparently refreshes the access token (using the refresh cookie)
 * and retries the original request once — mirroring the web client's
 * refresh-then-retry. If refresh fails, the session is cleared so the UI falls
 * back to the login screen.
 *
 * [api] is a [Provider] to break the Retrofit ⇄ OkHttp construction cycle.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val api: Provider<FlashkarteApi>,
    private val sessionStore: SessionStore,
) : Authenticator {

    private val apiHost = BuildConfig.API_BASE_URL.toHttpUrlOrNull()?.host

    override fun authenticate(route: Route?, response: Response): Request? {
        // Only refresh+reattach the token for the flashkarte API host (AND-001).
        if (response.request.url.host != apiHost) return null
        val path = response.request.url.encodedPath
        // Don't try to refresh the refresh/login/signup calls themselves.
        if (path.endsWith("/api/auth/refresh") ||
            path.endsWith("/api/auth/login") ||
            path.endsWith("/api/auth/signup")
        ) {
            return null
        }
        // Already retried once — give up to avoid a loop.
        if (responseCount(response) >= 2) return null

        val newToken = runCatching {
            runBlocking { api.get().refresh().accessToken }
        }.getOrNull()

        if (newToken == null) {
            runBlocking { sessionStore.clear() }
            return null
        }

        runBlocking { sessionStore.updateAccessToken(newToken) }
        return response.request.newBuilder()
            .header("Authorization", "Bearer $newToken")
            .build()
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
