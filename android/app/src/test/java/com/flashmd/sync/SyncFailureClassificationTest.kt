package com.flashmd.sync

import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

class SyncFailureClassificationTest {

    @Test
    fun `retries transport failures before the attempt cap`() {
        assertEquals(
            SyncFailureAction.RETRY,
            classifySyncFailure(IOException("offline"), runAttemptCount = 0),
        )
    }

    @Test
    fun `retries transient server failures`() {
        assertEquals(
            SyncFailureAction.RETRY,
            classifySyncFailure(httpException(503), runAttemptCount = 1),
        )
    }

    @Test
    fun `fails permanent client errors without retrying`() {
        assertEquals(
            SyncFailureAction.FAILURE,
            classifySyncFailure(httpException(422), runAttemptCount = 0),
        )
    }

    @Test
    fun `fails transient errors after five attempts`() {
        assertEquals(
            SyncFailureAction.FAILURE,
            classifySyncFailure(IOException("still offline"), runAttemptCount = 4),
        )
    }

    private fun httpException(status: Int): HttpException =
        HttpException(Response.error<Unit>(status, "".toResponseBody()))
}
