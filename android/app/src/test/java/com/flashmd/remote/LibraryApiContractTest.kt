package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class LibraryApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Before fun setUp() {
        server = MockWebServer(); server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build().create(FlashkarteApi::class.java)
    }
    @After fun tearDown() = server.shutdown()

    @Test fun parsesLibraryList() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"decks":[{"id":"d1","title":"Bio","author":"Ada","cardCount":42,"publishedAt":"2026-06-01T00:00:00.000Z"}]}"""))
        val res = api.listLibrary(null)
        assertEquals(1, res.decks.size)
        assertEquals("Ada", res.decks[0].author)
        assertEquals(42, res.decks[0].cardCount)
    }

    @Test fun parsesLibraryDetailAndClone() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"d1","title":"Bio","author":"Ada","cardCount":1,"publishedAt":null,"cards":[{"front":"Q","back":"A"}]}"""))
        val detail = api.getLibraryDeck("d1")
        assertEquals(1, detail.cards.size)
        assertEquals("Q", detail.cards[0].front)

        server.enqueue(MockResponse().setBody("""{"id":"new1","title":"Bio","card_count":1}"""))
        val cloned = api.cloneLibraryDeck("d1")
        assertEquals("new1", cloned.id)
        assertEquals(1, cloned.cardCount)
    }
}
