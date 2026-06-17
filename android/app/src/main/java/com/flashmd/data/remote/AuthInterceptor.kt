package com.flashmd.data.remote

import com.flashmd.BuildConfig
import com.flashmd.data.local.SessionStore
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Attaches the current access token as a Bearer header when one is present —
 * but only on requests to the flashkarte API host, so the token is never leaked
 * to a third-party host (e.g. a redirect this client follows) (AND-001).
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionStore: SessionStore,
) : Interceptor {
    private val apiHost = BuildConfig.API_BASE_URL.toHttpUrlOrNull()?.host

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = sessionStore.cachedAccessToken
        val sameHost = chain.request().url.host == apiHost
        val request = if (
            token != null &&
            sameHost &&
            chain.request().header("Authorization") == null
        ) {
            chain.request().newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
