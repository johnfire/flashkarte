package com.flashmd.data.repository

import android.os.Build
import com.flashmd.BuildConfig
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.BugReportRequest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Submits user bug reports to the server, which files them as GitHub issues.
 * Device + app-version metadata is attached automatically so reports are
 * actionable without the user having to describe their environment.
 */
@Singleton
class BugReportRepository @Inject constructor(
    private val api: FlashkarteApi,
) {
    /** Returns the created issue URL, or null when the server logged it instead. */
    suspend fun submit(title: String, description: String): String? {
        val res = apiCall {
            api.reportBug(
                BugReportRequest(
                    title = title.trim(),
                    description = description.trim(),
                    appVersion = BuildConfig.VERSION_NAME,
                    platform = "android",
                    device = "${Build.MANUFACTURER} ${Build.MODEL} (SDK ${Build.VERSION.SDK_INT})",
                ),
            )
        }
        return res.issueUrl
    }
}
