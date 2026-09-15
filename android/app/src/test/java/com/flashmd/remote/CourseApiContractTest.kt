package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.AddDeckToCourseRequest
import com.flashmd.data.remote.dto.CreateCourseRequest
import com.flashmd.data.remote.dto.ReorderCourseDecksRequest
import com.flashmd.data.remote.dto.UpdateCourseRequest
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

/**
 * Parses real server response shapes (snake_case, matching
 * packages/server/src/domains/courses exactly) against the DTOs' @SerialName
 * mappings -- the class of bug a plain unit test with hand-built DTOs
 * wouldn't catch.
 */
class CourseApiContractTest {
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

    @Test fun parsesCourseSummaryList() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """[{"id":"c1","user_id":"u1","title":"Circuits","description":null,
               |"is_public":false,"created_at":"2026-01-01T00:00:00.000Z",
               |"updated_at":"2026-01-01T00:00:00.000Z","decks_total":3,"decks_mastered":1}]"""
                .trimMargin(),
        ))
        val list = api.listCourses()
        assertEquals(1, list.size)
        assertEquals(3, list[0].decksTotal)
        assertEquals(1, list[0].decksMastered)
        assertEquals(false, list[0].isPublic)
    }

    @Test fun createsACourse() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"c1","user_id":"u1","title":"Circuits","description":null,
               |"is_public":false,"created_at":"x","updated_at":"x","decks_total":0,"decks_mastered":0}"""
                .trimMargin(),
        ))
        val created = api.createCourse(CreateCourseRequest("Circuits"))
        assertEquals("c1", created.id)
        val request = server.takeRequest()
        assertEquals("""{"title":"Circuits"}""", request.body.readUtf8())
    }

    @Test fun parsesCourseDetailWithGatedDecks() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"c1","user_id":"u1","title":"Circuits","description":"The basics",
               |"is_public":true,"created_at":"x","updated_at":"x","decks":[
               |{"deck_id":"d1","position":0,"title":"Unit 1","card_count":2,
               |"mastered_count":2,"mastered":true,"locked":false},
               |{"deck_id":"d2","position":1,"title":"Unit 2","card_count":1,
               |"mastered_count":0,"mastered":false,"locked":true}]}"""
                .trimMargin(),
        ))
        val detail = api.getCourse("c1")
        assertEquals(2, detail.decks.size)
        assertEquals(false, detail.decks[0].locked)
        assertEquals(true, detail.decks[1].locked)
        assertEquals("The basics", detail.description)
    }

    @Test fun updatesCourseVisibility() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"c1","user_id":"u1","title":"Circuits","description":null,
               |"is_public":true,"created_at":"x","updated_at":"x","decks_total":0,"decks_mastered":0}"""
                .trimMargin(),
        ))
        val updated = api.updateCourse("c1", UpdateCourseRequest(isPublic = true))
        assertEquals(true, updated.isPublic)
        val request = server.takeRequest()
        assertEquals("""{"isPublic":true}""", request.body.readUtf8())
    }

    @Test fun addDeckSendsSnakeCaseDeckId() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(201))
        api.addDeckToCourse("c1", AddDeckToCourseRequest("d1"))
        val request = server.takeRequest()
        assertEquals("""{"deck_id":"d1"}""", request.body.readUtf8())
    }

    @Test fun reorderSendsTheOrderArray() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200))
        api.reorderCourseDecks("c1", ReorderCourseDecksRequest(listOf("d2", "d1")))
        val request = server.takeRequest()
        assertEquals("""{"order":["d2","d1"]}""", request.body.readUtf8())
    }

    @Test fun parsesPublicCourseListAndPreview() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """[{"id":"c1","title":"Circuits","description":"The basics","decks_total":2}]""",
        ))
        val list = api.listPublicCourses()
        assertEquals(2, list[0].decksTotal)

        server.enqueue(MockResponse().setBody(
            """{"id":"c1","title":"Circuits","description":"The basics","decks":[
               |{"deck_id":"d1","position":0,"title":"Unit 1","card_count":2}]}"""
                .trimMargin(),
        ))
        val preview = api.getPublicCourse("c1")
        assertEquals(1, preview.decks.size)
        assertEquals(2, preview.decks[0].cardCount)
    }

    @Test fun parsesCloneResponse() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"course":{"id":"new-c1","user_id":"u2","title":"Circuits","description":null,
               |"is_public":false,"created_at":"x","updated_at":"x"},
               |"decks_cloned":2,"source_id":"c1"}"""
                .trimMargin(),
        ))
        val result = api.cloneCourse("c1")
        assertEquals("new-c1", result.course.id)
        assertEquals(2, result.decksCloned)
        assertEquals("c1", result.sourceId)
    }
}
