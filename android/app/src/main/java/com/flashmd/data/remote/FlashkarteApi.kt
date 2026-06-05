package com.flashmd.data.remote

import com.flashmd.data.remote.dto.AuthResponse
import com.flashmd.data.remote.dto.ClientErrorRequest
import com.flashmd.data.remote.dto.CredentialsRequest
import com.flashmd.data.remote.dto.DeckCreatedDto
import com.flashmd.data.remote.dto.DeckDetailDto
import com.flashmd.data.remote.dto.DeckListItemDto
import com.flashmd.data.remote.dto.ImportRequest
import com.flashmd.data.remote.dto.RefreshResponse
import com.flashmd.data.remote.dto.ReviewRequest
import com.flashmd.data.remote.dto.ReviewResponseDto
import com.flashmd.data.remote.dto.StatsDto
import com.flashmd.data.remote.dto.StudyCardDto
import com.flashmd.data.remote.dto.SyncRequest
import com.flashmd.data.remote.dto.SyncResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface FlashkarteApi {

    @POST("api/auth/signup")
    suspend fun signup(@Body body: CredentialsRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body body: CredentialsRequest): AuthResponse

    @POST("api/auth/refresh")
    suspend fun refresh(): RefreshResponse

    @POST("api/auth/logout")
    suspend fun logout(): Response<Unit>

    @GET("api/decks")
    suspend fun listDecks(): List<DeckListItemDto>

    @GET("api/decks/{id}")
    suspend fun getDeck(@Path("id") id: String): DeckDetailDto

    @POST("api/decks")
    suspend fun importDeck(@Body body: ImportRequest): DeckCreatedDto

    @DELETE("api/decks/{id}")
    suspend fun deleteDeck(@Path("id") id: String): Response<Unit>

    @GET("api/decks/{id}/study")
    suspend fun studyBatch(@Path("id") id: String): List<StudyCardDto>

    @GET("api/decks/{id}/stats")
    suspend fun stats(@Path("id") id: String): StatsDto

    @POST("api/study/review")
    suspend fun review(@Body body: ReviewRequest): ReviewResponseDto

    @POST("api/study/sync")
    suspend fun syncReviews(@Body body: SyncRequest): SyncResponse

    @POST("api/client-errors")
    suspend fun reportClientError(@Body body: ClientErrorRequest): Response<Unit>
}
