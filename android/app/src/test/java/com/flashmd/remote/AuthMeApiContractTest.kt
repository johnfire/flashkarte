package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.UpdateProfileRequest
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

class AuthMeApiContractTest {
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

    @Test fun parsesMeProfile() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"user":{"id":"u1","email":"a@b.c","role":"user","accountType":"free","emailVerifiedAt":null,"displayName":"Ada"}}"""))
        val res = api.getMe()
        assertEquals("free", res.user.accountType)
        assertEquals("Ada", res.user.displayName)
        assertEquals(null, res.user.emailVerifiedAt)
    }

    @Test fun updateMeSendsDisplayName() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"user":{"id":"u1","email":"a@b.c","role":"user","accountType":"free","emailVerifiedAt":null,"displayName":"Bob"}}"""))
        val res = api.updateMe(UpdateProfileRequest("Bob"))
        assertEquals("Bob", res.user.displayName)
        val req = server.takeRequest()
        assertEquals("PATCH", req.method)
        assertTrue(req.body.readUtf8().contains("\"displayName\":\"Bob\""))
    }
}
