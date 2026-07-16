package com.flashmd.data.remote

import com.flashmd.data.remote.dto.AddCardsRequest
import com.flashmd.data.remote.dto.AddCardsResponse
import com.flashmd.data.remote.dto.AuthResponse
import com.flashmd.data.remote.dto.BugReportRequest
import com.flashmd.data.remote.dto.BugReportResponse
import com.flashmd.data.remote.dto.ChangePasswordRequest
import com.flashmd.data.remote.dto.ClientErrorRequest
import com.flashmd.data.remote.dto.CredentialsRequest
import com.flashmd.data.remote.dto.DeckCreatedDto
import com.flashmd.data.remote.dto.DeleteAccountRequest
import com.flashmd.data.remote.dto.DeckDetailDto
import com.flashmd.data.remote.dto.DeckListItemDto
import com.flashmd.data.remote.dto.ForgotPasswordRequest
import com.flashmd.data.remote.dto.ImportRequest
import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.remote.dto.LibraryListResponse
import com.flashmd.data.remote.dto.MeResponse
import com.flashmd.data.remote.dto.RefreshResponse
import com.flashmd.data.remote.dto.ReviewRequest
import com.flashmd.data.remote.dto.ReviewResponseDto
import com.flashmd.data.remote.dto.StatsDto
import com.flashmd.data.remote.dto.StudyCardDto
import com.flashmd.data.remote.dto.SyncRequest
import com.flashmd.data.remote.dto.SyncResponse
import com.flashmd.data.remote.dto.UpdateDeckRequest
import com.flashmd.data.remote.dto.UpdateProfileRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

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

    // Deck mutations
    @PATCH("api/decks/{id}")
    suspend fun updateDeck(@Path("id") id: String, @Body body: UpdateDeckRequest): DeckDetailDto

    @POST("api/decks/{id}/cards")
    suspend fun addCards(@Path("id") id: String, @Body body: AddCardsRequest): AddCardsResponse

    // Library
    @GET("api/library")
    suspend fun listLibrary(@Query("q") q: String?): LibraryListResponse

    @GET("api/library/{id}")
    suspend fun getLibraryDeck(@Path("id") id: String): LibraryDeckDetailDto

    @POST("api/library/{id}/clone")
    suspend fun cloneLibraryDeck(@Path("id") id: String): DeckCreatedDto

    // Account
    @GET("api/auth/me")
    suspend fun getMe(): MeResponse

    @PATCH("api/auth/me")
    suspend fun updateMe(@Body body: UpdateProfileRequest): MeResponse

    @POST("api/auth/resend-verification")
    suspend fun resendVerification(): Response<Unit>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<Unit>

    @POST("api/auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): AuthResponse

    // Retrofit's @DELETE forbids a request body; the server re-authenticates
    // the deletion with the current password, so use @HTTP with hasBody.
    // Returns Unit (not Response<Unit>) so a 422 wrong-password surfaces as an
    // HttpException that apiCall converts into a user-visible ApiException.
    @HTTP(method = "DELETE", path = "api/auth/account", hasBody = true)
    suspend fun deleteAccount(@Body body: DeleteAccountRequest)

    // Raw body: the export is saved to a user-chosen file verbatim, so there's
    // no point deserializing and re-serializing it.
    @GET("api/account/export")
    suspend fun exportAccountData(): okhttp3.ResponseBody

    @POST("api/client-errors")
    suspend fun reportClientError(@Body body: ClientErrorRequest): Response<Unit>

    @POST("api/bug-reports")
    suspend fun reportBug(@Body body: BugReportRequest): BugReportResponse
}
