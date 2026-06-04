package com.flashmd.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.flashmd.data.remote.dto.UserDto
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "flashkarte_session")

/**
 * Persists the access token + signed-in user. The access token is also held in
 * a volatile field so the OkHttp request interceptor can read it synchronously
 * without blocking on DataStore for every call. The long-lived refresh token is
 * NOT stored here — it lives in the httpOnly cookie managed by [AuthCookieJar].
 */
@Singleton
class SessionStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val accessTokenKey = stringPreferencesKey("access_token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val userEmailKey = stringPreferencesKey("user_email")

    @Volatile
    var cachedAccessToken: String? = null
        private set

    init {
        // Prime the in-memory cache once at startup so the first request can
        // attach a token without awaiting DataStore.
        runBlocking {
            cachedAccessToken = context.dataStore.data.first()[accessTokenKey]
        }
    }

    val isLoggedIn: Flow<Boolean> =
        context.dataStore.data
            .map { it[accessTokenKey] != null }
            .distinctUntilChanged()

    val userEmail: Flow<String?> =
        context.dataStore.data.map { it[userEmailKey] }

    suspend fun saveSession(token: String, user: UserDto) {
        cachedAccessToken = token
        context.dataStore.edit {
            it[accessTokenKey] = token
            it[userIdKey] = user.id
            it[userEmailKey] = user.email
        }
    }

    suspend fun updateAccessToken(token: String) {
        cachedAccessToken = token
        context.dataStore.edit { it[accessTokenKey] = token }
    }

    suspend fun clear() {
        cachedAccessToken = null
        context.dataStore.edit { it.clear() }
    }
}
