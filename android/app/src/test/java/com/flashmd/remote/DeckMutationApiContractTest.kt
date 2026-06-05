package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.AddCardsRequest
import com.flashmd.data.remote.dto.UpdateDeckRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class DeckMutationApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Before fun setUp() {
        server = MockWebServer(); server.start()
        api = Retrofit.Builder().baseUrl(server.url("/")).client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build().create(FlashkarteApi::class.java)
    }
    @After fun tearDown() = server.shutdown()

    @Test fun patchDeckSendsTitleAndParsesDetail() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"d1","title":"New","source_filename":null,"created_at":"x","updated_at":"y"}"""))
        val res = api.updateDeck("d1", UpdateDeckRequest(title = "New"))
        assertEquals("New", res.title)
        val req = server.takeRequest()
        assertEquals("PATCH", req.method)
        assertTrue(req.body.readUtf8().contains("\"title\":\"New\""))
    }

    @Test fun addCardsSendsMarkdownAndParsesCount() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"deck_id":"d1","added":3}"""))
        val res = api.addCards("d1", AddCardsRequest("Q: a\nA: b"))
        assertEquals(3, res.added)
        assertEquals("d1", res.deckId)
        val req = server.takeRequest()
        assertTrue(req.body.readUtf8().contains("markdown"))
    }
}
