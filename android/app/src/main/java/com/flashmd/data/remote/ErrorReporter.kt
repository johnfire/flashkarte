package com.flashmd.data.remote

import com.flashmd.BuildConfig
import com.flashmd.data.remote.dto.ClientErrorRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

/**
 * Ships client-side errors to the server master log (`POST /api/client-errors`).
 * Best-effort: it never throws and silently drops failures so reporting can't
 * cascade into more errors. [api] is a [Provider] to avoid construction cycles.
 */
@Singleton
class ErrorReporter @Inject constructor(
    private val api: Provider<FlashkarteApi>,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun report(message: String, context: String? = null, throwable: Throwable? = null) {
        scope.launch {
            runCatching {
                api.get().reportClientError(
                    ClientErrorRequest(
                        app = "android",
                        message = message.take(2000),
                        appVersion = BuildConfig.VERSION_NAME,
                        platform = "android",
                        context = context,
                        stack = throwable?.stackTraceToString()?.take(8000),
                    ),
                )
            }
        }
    }
}
