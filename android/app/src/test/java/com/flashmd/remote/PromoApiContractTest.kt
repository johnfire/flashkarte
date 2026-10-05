package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.CredentialsRequest
import com.flashmd.data.remote.dto.PromoCodeRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class PromoApiContractTest {
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

    @Test fun previewsAFreePromoWithoutAuthentication() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"code":"FREE30","kind":"free_access","freeDays":30,"eligiblePlan":"any"}"""))
        val promo = api.previewPromo(PromoCodeRequest("FREE30"))
        assertEquals(30, promo.freeDays)
        val request = server.takeRequest()
        assertEquals("/api/auth/promos/preview", request.path)
        assertEquals("FREE30", json.parseToJsonElement(request.body.readUtf8()).jsonObject["code"]!!.jsonPrimitive.content)
    }

    @Test fun sendsCodeAndSelectedPlanAlongsideSignupCredentials() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"user":{"id":"u1","email":"new@example.com","role":"user"},"accessToken":"test-token"}"""))
        api.signup(CredentialsRequest("new@example.com", "password123", true, "YEAR20", "yearly"))
        val request = server.takeRequest()
        assertEquals("/api/auth/signup", request.path)
        val body = json.parseToJsonElement(request.body.readUtf8()).jsonObject
        assertEquals("YEAR20", body["promoCode"]!!.jsonPrimitive.content)
        assertEquals("yearly", body["signupPlan"]!!.jsonPrimitive.content)
        assertNull(body["paymentDetails"])
    }

    @Test fun parsesPromoExpiryAndSavedDiscountFromBillingStatus() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"plan":"paid","accountType":"free","activeUnitCount":11,"promoAccessEndsAt":"2026-11-04T09:00:00Z","signupDiscount":{"code":"YEAR20","percentOff":20,"discountDuration":"once","plan":"yearly"}}"""))
        val status = api.getBillingStatus()
        assertEquals("2026-11-04T09:00:00Z", status.promoAccessEndsAt)
        assertEquals("YEAR20", status.signupDiscount?.code)
        assertEquals("yearly", status.signupDiscount?.plan)
    }
}
