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

class CourseCollectionApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi

    @Before fun setUp() {
        server = MockWebServer()
        server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient())
            .addConverterFactory(Json { ignoreUnknownKeys = true; explicitNulls = false }.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(FlashkarteApi::class.java)
    }

    @After fun tearDown() = server.shutdown()

    @Test fun courseCollectionEndpointsUseTheExpectedCatalogContract() = runBlocking {
        server.enqueue(MockResponse().setBody("""[{"id":"ai","title":"Artificial Intelligence","description":"Learn AI","is_official":true,"course_count":2}]"""))
        val collections = api.listCourseCollections("official")
        assertEquals("Artificial Intelligence", collections.single().title)
        assertEquals("/api/course-collections?source=official", server.takeRequest().path)

        server.enqueue(MockResponse().setBody("""{"id":"ai","title":"Artificial Intelligence","description":null,"is_official":true,"courses":[{"id":"s1","title":"Foundations","concept_count":3,"course_collection_id":"ai","course_collection_position":1,"course_collection_title":"Artificial Intelligence"}]}"""))
        val detail = api.getCourseCollection("ai", "official")
        assertEquals("ai", detail.courses.single().courseCollectionId)
        assertEquals("/api/course-collections/ai?source=official", server.takeRequest().path)

        server.enqueue(MockResponse().setBody("""[{"id":"s2","title":"Standalone","concept_count":1}]"""))
        assertEquals("Standalone", api.listUngroupedCourseCatalog("community").single().title)
        assertEquals("/api/subjects/catalog?source=community&ungrouped=true", server.takeRequest().path)

        server.enqueue(MockResponse().setResponseCode(204))
        api.enrollInCourse("s1")
        assertEquals("POST", server.takeRequest().method)
    }
}
