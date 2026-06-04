package com.flashmd.data.remote

import com.flashmd.data.remote.dto.ApiErrorEnvelope
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException

private val errorJson = Json { ignoreUnknownKeys = true }

/**
 * Runs a Retrofit call and normalises failures: a non-2xx response becomes an
 * [ApiException] carrying the server's `{ error: { code, message } }`; a
 * transport failure becomes an [ApiException] with status 0.
 */
suspend fun <T> apiCall(block: suspend () -> T): T {
    try {
        return block()
    } catch (e: HttpException) {
        val raw = e.response()?.errorBody()?.string()
        val parsed = raw
            ?.let { runCatching { errorJson.decodeFromString<ApiErrorEnvelope>(it) }.getOrNull() }
            ?.error
        throw ApiException(
            status = e.code(),
            code = parsed?.code ?: "HTTP_${e.code()}",
            message = parsed?.message?.takeIf { it.isNotBlank() }
                ?: "Request failed (HTTP ${e.code()})",
        )
    } catch (e: IOException) {
        throw ApiException(
            status = 0,
            code = "NETWORK_ERROR",
            message = "Can't reach the server. Check your connection.",
        )
    }
}
