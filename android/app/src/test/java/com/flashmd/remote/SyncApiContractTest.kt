package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.SyncEventDto
import com.flashmd.data.remote.dto.SyncRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class SyncApiContractTest {
    @Test
    fun parsesSyncResponse() = runBlocking {
        val server = MockWebServer()
        server.enqueue(
            MockResponse().setBody(
                """{"acked_event_ids":["e1"],"progress":[{"card_id":"c1","easiness":2.5,"interval":1,"repetitions":1,"due_at":"2026-06-06T00:00:00.000Z","last_rating":4}]}""",
            ),
        )
        server.start()
        val json = Json { ignoreUnknownKeys = true }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(FlashkarteApi::class.java)

        val res = api.syncReviews(
            SyncRequest(listOf(SyncEventDto("e1", "c1", 4, "2026-06-05T09:00:00Z"))),
        )
        assertEquals(listOf("e1"), res.acked_event_ids)
        assertEquals(1, res.progress.single().interval)
        server.shutdown()
    }
}
