package com.flashmd.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import javax.inject.Inject
import javax.inject.Singleton

private val Context.cookieDataStore by preferencesDataStore(name = "flashkarte_cookies")

@Serializable
private data class StoredCookie(
    val name: String,
    val value: String,
    val domain: String,
    val path: String,
    val expiresAt: Long,
    val secure: Boolean,
    val httpOnly: Boolean,
    val hostOnly: Boolean,
)

/**
 * Minimal persistent [CookieJar] so the refresh cookie (`fk_refresh`, httpOnly,
 * path `/api/auth`) survives process death — the Android equivalent of the
 * web client's `credentials: include`. Cookies are kept in memory and mirrored
 * to DataStore; expired ones are dropped on load.
 */
@Singleton
class AuthCookieJar @Inject constructor(
    @ApplicationContext private val context: Context,
) : CookieJar {

    private val key = stringPreferencesKey("cookies")
    private val json = Json { ignoreUnknownKeys = true }
    private val cookies = mutableMapOf<String, StoredCookie>()

    init {
        runBlocking {
            val raw = context.cookieDataStore.data.first()[key]
            if (raw != null) {
                runCatching { json.decodeFromString<List<StoredCookie>>(raw) }
                    .getOrDefault(emptyList())
                    .forEach { cookies[it.name] = it }
            }
        }
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        for (c in cookies) {
            this.cookies[c.name] = StoredCookie(
                name = c.name,
                value = c.value,
                domain = c.domain,
                path = c.path,
                expiresAt = c.expiresAt,
                secure = c.secure,
                httpOnly = c.httpOnly,
                hostOnly = c.hostOnly,
            )
        }
        persist()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        val expired = cookies.values.filter { it.expiresAt <= now }
        if (expired.isNotEmpty()) {
            expired.forEach { cookies.remove(it.name) }
            persist()
        }
        return cookies.values
            .mapNotNull { it.toOkHttp() }
            .filter { it.matches(url) }
    }

    @Synchronized
    fun clear() {
        cookies.clear()
        persist()
    }

    private fun persist() {
        val snapshot = json.encodeToString(cookies.values.toList())
        runBlocking { context.cookieDataStore.edit { it[key] = snapshot } }
    }

    private fun StoredCookie.toOkHttp(): Cookie? {
        val builder = Cookie.Builder()
            .name(name)
            .value(value)
            .path(path)
            .expiresAt(expiresAt)
        if (hostOnly) builder.hostOnlyDomain(domain) else builder.domain(domain)
        if (secure) builder.secure()
        if (httpOnly) builder.httpOnly()
        return runCatching { builder.build() }.getOrNull()
    }
}
