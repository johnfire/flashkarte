package com.flashmd.data.remote

/**
 * Thrown when the API returns a non-2xx response. [code] is the server's
 * machine-readable error code (e.g. VALIDATION_ERROR, AUTH_ERROR); [message]
 * is human-readable and safe to surface in the UI.
 */
class ApiException(
    val status: Int,
    val code: String,
    message: String,
) : Exception(message)
