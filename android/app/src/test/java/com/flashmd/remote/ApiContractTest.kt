package com.flashmd.remote

import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.CredentialsRequest
import com.flashmd.data.remote.dto.ImportRequest
import com.flashmd.data.remote.dto.ReviewRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Verifies the Android DTOs deserialize the EXACT JSON shapes the flashkarte
 * server emits (and that request bodies serialize to the field names the server
 * expects). This is the contract the app can't runtime-check without a device,
 * so it's pinned here against representative server payloads.
 *
 * The Json config mirrors NetworkModule.provideJson().
 */
class ApiContractTest {

    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        val contentType = "application/json".toMediaType()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create(FlashkarteApi::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun enqueue(code: Int, body: String) {
        server.enqueue(
            MockResponse()
                .setResponseCode(code)
                .setHeader("Content-Type", "application/json")
                .setBody(body),
        )
    }

    @Test
    fun `deck list parses string counts and null source_filename`() = runBlocking {
        // Server returns count(*) as JSON strings, source_filename may be null.
        enqueue(
            200,
            """
            [
              {"id":"d1","title":"Biology","source_filename":null,
               "created_at":"2026-06-04T10:00:00.000Z","updated_at":"2026-06-04T12:00:00.000Z",
               "card_count":"42","due_count":"7"}
            ]
            """.trimIndent(),
        )

        val decks = apiCall { api.listDecks() }

        assertEquals(1, decks.size)
        assertEquals("Biology", decks[0].title)
        assertNull(decks[0].sourceFilename)
        assertEquals(42, decks[0].cardCount.toInt())
        assertEquals(7, decks[0].dueCount.toInt())
    }

    @Test
    fun `stats parses new field and learned`() = runBlocking {
        enqueue(200, """{"total":10,"new":4,"due":6,"learned":3}""")

        val stats = apiCall { api.stats("d1") }

        assertEquals(10, stats.total)
        assertEquals(4, stats.newCount)
        assertEquals(6, stats.due)
        assertEquals(3, stats.learned)
    }

    @Test
    fun `study batch parses nested content`() = runBlocking {
        enqueue(
            200,
            """[{"id":"c1","content":{"front":"Q1","back":"A1"},"category":"Cells"}]""",
        )

        val cards = apiCall { api.studyBatch("d1") }

        assertEquals(1, cards.size)
        assertEquals("c1", cards[0].id)
        assertEquals("Q1", cards[0].content.front)
        assertEquals("A1", cards[0].content.back)
        assertEquals("Cells", cards[0].category)
    }

    @Test
    fun `login parses user and access token`() = runBlocking {
        enqueue(
            200,
            """{"user":{"id":"u1","email":"a@b.com","role":"user"},
                "accessToken":"jwt.token.here","expiresIn":900}""",
        )

        val res = apiCall { api.login(CredentialsRequest("a@b.com", "password123", true)) }

        assertEquals("u1", res.user.id)
        assertEquals("a@b.com", res.user.email)
        assertEquals("jwt.token.here", res.accessToken)
        assertEquals(900, res.expiresIn)
    }

    @Test
    fun `login always sends rememberMe true (mobile has no session-cookie prompt)`() = runBlocking {
        enqueue(
            200,
            """{"user":{"id":"u1","email":"a@b.com","role":"user"},"accessToken":"t","expiresIn":900}""",
        )

        apiCall { api.login(CredentialsRequest("a@b.com", "password123", true)) }

        val recorded = server.takeRequest()
        val body = recorded.body.readUtf8()
        // Guards against kotlinx's encodeDefaults=false silently dropping a
        // defaulted-true field — rememberMe must actually be on the wire.
        assertTrue("body should include rememberMe:true: $body", body.contains("\"rememberMe\":true"))
    }

    @Test
    fun `import response parses numeric card_count`() = runBlocking {
        enqueue(201, """{"id":"d9","title":"New Deck","card_count":5}""")

        val created = apiCall { api.importDeck(ImportRequest("# New Deck\n\n**1. Q**\nA", "New Deck")) }

        assertEquals("d9", created.id)
        assertEquals(5, created.cardCount)
    }

    @Test
    fun `error envelope maps to ApiException with code and message`() = runBlocking {
        enqueue(
            422,
            """{"error":{"code":"VALIDATION_ERROR","message":"Deck has no cards — check the Markdown format"}}""",
        )

        try {
            apiCall { api.importDeck(ImportRequest("# Empty", null)) }
            fail("expected ApiException")
        } catch (e: ApiException) {
            assertEquals(422, e.status)
            assertEquals("VALIDATION_ERROR", e.code)
            assertEquals("Deck has no cards — check the Markdown format", e.message)
        }
    }

    @Test
    fun `non-json error body falls back to http code`() = runBlocking {
        enqueue(500, "Internal Server Error")

        try {
            apiCall { api.listDecks() }
            fail("expected ApiException")
        } catch (e: ApiException) {
            assertEquals(500, e.status)
            assertEquals("HTTP_500", e.code)
        }
    }

    @Test
    fun `review request serializes snake_case card_id`() = runBlocking {
        enqueue(200, """{"card_id":"c1"}""")

        apiCall { api.review(ReviewRequest("c1", 4)) }

        val recorded = server.takeRequest()
        assertEquals("/api/study/review", recorded.path)
        val sentBody = recorded.body.readUtf8()
        assertTrue("body should use card_id: $sentBody", sentBody.contains("\"card_id\":\"c1\""))
        assertTrue("body should include rating: $sentBody", sentBody.contains("\"rating\":4"))
    }

    @Test
    fun `credentials request omits nothing and uses email and password`() = runBlocking {
        enqueue(
            200,
            """{"user":{"id":"u1","email":"a@b.com","role":"user"},"accessToken":"t","expiresIn":900}""",
        )

        apiCall { api.signup(CredentialsRequest("a@b.com", "password123", true)) }

        val recorded = server.takeRequest()
        assertEquals("/api/auth/signup", recorded.path)
        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"email\":\"a@b.com\""))
        assertTrue(body.contains("\"password\":\"password123\""))
    }

    @Test
    fun `import request omits null title`() = runBlocking {
        enqueue(201, """{"id":"d1","title":"T","card_count":1}""")

        apiCall { api.importDeck(ImportRequest("# T\n\n**1. Q**\nA", null)) }

        val recorded = server.takeRequest()
        val body = recorded.body.readUtf8()
        // explicitNulls=false → null title is omitted from the payload entirely.
        assertTrue("title should be omitted: $body", !body.contains("\"title\""))
        assertTrue(body.contains("\"markdown\""))
    }
}
