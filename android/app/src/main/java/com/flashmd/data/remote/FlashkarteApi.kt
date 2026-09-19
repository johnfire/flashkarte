package com.flashmd.data.remote

import com.flashmd.data.remote.dto.AddCardsRequest
import com.flashmd.data.remote.dto.AddCardsResponse
import com.flashmd.data.remote.dto.AuthResponse
import com.flashmd.data.remote.dto.BugReportRequest
import com.flashmd.data.remote.dto.BugReportResponse
import com.flashmd.data.remote.dto.ChangePasswordRequest
import com.flashmd.data.remote.dto.ClientErrorRequest
import com.flashmd.data.remote.dto.CloneCourseResponse
import com.flashmd.data.remote.dto.AddDeckToCourseRequest
import com.flashmd.data.remote.dto.CourseDetailDto
import com.flashmd.data.remote.dto.CourseSummaryDto
import com.flashmd.data.remote.dto.CreateCourseRequest
import com.flashmd.data.remote.dto.CredentialsRequest
import com.flashmd.data.remote.dto.DeckCreatedDto
import com.flashmd.data.remote.dto.DeleteAccountRequest
import com.flashmd.data.remote.dto.DeckDetailDto
import com.flashmd.data.remote.dto.DeckListItemDto
import com.flashmd.data.remote.dto.DeckSettingsDto
import com.flashmd.data.remote.dto.ForgotPasswordRequest
import com.flashmd.data.remote.dto.ImportRequest
import com.flashmd.data.remote.dto.LessonReadsRequest
import com.flashmd.data.remote.dto.LessonReadsResponseDto
import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.remote.dto.LibraryListResponse
import com.flashmd.data.remote.dto.LoginResponse
import com.flashmd.data.remote.dto.MeResponse
import com.flashmd.data.remote.dto.PublicCourseDetailDto
import com.flashmd.data.remote.dto.PublicCourseSummaryDto
import com.flashmd.data.remote.dto.RefreshResponse
import com.flashmd.data.remote.dto.ReorderCourseDecksRequest
import com.flashmd.data.remote.dto.ReviewRequest
import com.flashmd.data.remote.dto.ReviewResponseDto
import com.flashmd.data.remote.dto.StatsDto
import com.flashmd.data.remote.dto.StudyCardDto
import com.flashmd.data.remote.dto.SyncRequest
import com.flashmd.data.remote.dto.SyncResponse
import com.flashmd.data.remote.dto.TwoFactorBackupCodesResponse
import com.flashmd.data.remote.dto.TwoFactorCodeRequest
import com.flashmd.data.remote.dto.TwoFactorLoginRequest
import com.flashmd.data.remote.dto.TwoFactorSetupResponse
import com.flashmd.data.remote.dto.UpdateCourseRequest
import com.flashmd.data.remote.dto.UpdateDeckRequest
import com.flashmd.data.remote.dto.UpdateProfileRequest
import com.flashmd.data.remote.dto.AnswerRequest
import com.flashmd.data.remote.dto.CommentRequest
import com.flashmd.data.remote.dto.DueReviewsDto
import com.flashmd.data.remote.dto.LearnSubjectDto
import com.flashmd.data.remote.dto.LearnerOutlineDto
import com.flashmd.data.remote.dto.LessonAnswerResponseDto
import com.flashmd.data.remote.dto.LessonScreensDto
import com.flashmd.data.remote.dto.LessonStepResponseDto
import com.flashmd.data.remote.dto.ReviewAnswerResponseDto
import com.flashmd.data.remote.dto.ReviewStepResponseDto
import com.flashmd.data.remote.dto.ScreenCommentDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import kotlinx.serialization.json.JsonObject

interface FlashkarteApi {

    @POST("api/auth/signup")
    suspend fun signup(@Body body: CredentialsRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body body: CredentialsRequest): LoginResponse

    @POST("api/auth/2fa/verify")
    suspend fun twoFactorLogin(@Body body: TwoFactorLoginRequest): AuthResponse

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

    // lessons=1 opts in to reading cards; the server never sends them otherwise.
    @GET("api/decks/{id}/study")
    suspend fun studyBatch(
        @Path("id") id: String,
        @Query("lessons") lessons: Int = 1,
    ): List<StudyCardDto>

    @GET("api/decks/{id}/settings")
    suspend fun getDeckSettings(@Path("id") id: String): DeckSettingsDto

    @GET("api/decks/{id}/stats")
    suspend fun stats(@Path("id") id: String): StatsDto

    @POST("api/study/reads")
    suspend fun recordLessonReads(@Body body: LessonReadsRequest): LessonReadsResponseDto

    @POST("api/study/review")
    suspend fun review(@Body body: ReviewRequest): ReviewResponseDto

    @POST("api/study/sync")
    suspend fun syncReviews(@Body body: SyncRequest): SyncResponse

    // Deck mutations
    @PATCH("api/decks/{id}")
    suspend fun updateDeck(@Path("id") id: String, @Body body: UpdateDeckRequest): DeckDetailDto

    // Speech overrides are sent as a raw JsonObject rather than a data class:
    // the app's Json has explicitNulls = false, which would silently drop the
    // explicit nulls that mean "reset this field to inherit".
    @PATCH("api/decks/{id}")
    suspend fun updateDeckSpeech(
        @Path("id") id: String,
        @Body body: JsonObject,
    ): DeckSettingsDto

    @POST("api/decks/{id}/cards")
    suspend fun addCards(@Path("id") id: String, @Body body: AddCardsRequest): AddCardsResponse

    // Library
    @GET("api/library")
    suspend fun listLibrary(@Query("q") q: String?): LibraryListResponse

    @GET("api/library/{id}")
    suspend fun getLibraryDeck(@Path("id") id: String): LibraryDeckDetailDto

    @POST("api/library/{id}/clone")
    suspend fun cloneLibraryDeck(@Path("id") id: String): DeckCreatedDto

    // Courses
    @GET("api/courses")
    suspend fun listCourses(): List<CourseSummaryDto>

    @POST("api/courses")
    suspend fun createCourse(@Body body: CreateCourseRequest): CourseSummaryDto

    @GET("api/courses/{id}")
    suspend fun getCourse(@Path("id") id: String): CourseDetailDto

    @PATCH("api/courses/{id}")
    suspend fun updateCourse(
        @Path("id") id: String,
        @Body body: UpdateCourseRequest,
    ): CourseSummaryDto

    @DELETE("api/courses/{id}")
    suspend fun deleteCourse(@Path("id") id: String): Response<Unit>

    @POST("api/courses/{id}/decks")
    suspend fun addDeckToCourse(
        @Path("id") id: String,
        @Body body: AddDeckToCourseRequest,
    ): Response<Unit>

    @DELETE("api/courses/{id}/decks/{deckId}")
    suspend fun removeDeckFromCourse(
        @Path("id") id: String,
        @Path("deckId") deckId: String,
    ): Response<Unit>

    @PATCH("api/courses/{id}/decks/reorder")
    suspend fun reorderCourseDecks(
        @Path("id") id: String,
        @Body body: ReorderCourseDecksRequest,
    ): Response<Unit>

    @GET("api/library/courses")
    suspend fun listPublicCourses(): List<PublicCourseSummaryDto>

    @GET("api/library/courses/{id}")
    suspend fun getPublicCourse(@Path("id") id: String): PublicCourseDetailDto

    @POST("api/library/courses/{id}/clone")
    suspend fun cloneCourse(@Path("id") id: String): CloneCourseResponse

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

    // Two-factor auth. Unit returns (not Response<Unit>) so non-2xx becomes
    // an ApiException with the server's message.
    @POST("api/account/2fa/setup")
    suspend fun twoFactorSetup(): TwoFactorSetupResponse

    @POST("api/account/2fa/verify")
    suspend fun twoFactorEnable(@Body body: TwoFactorCodeRequest): TwoFactorBackupCodesResponse

    @POST("api/account/2fa/disable")
    suspend fun twoFactorDisable(@Body body: TwoFactorCodeRequest)

    @POST("api/client-errors")
    suspend fun reportClientError(@Body body: ClientErrorRequest): Response<Unit>

    @POST("api/bug-reports")
    suspend fun reportBug(@Body body: BugReportRequest): BugReportResponse

    // --- Learn: structured lessons (the server holds the session; the app draws the step) ---

    @GET("api/subjects")
    suspend fun listLearnSubjects(): List<LearnSubjectDto>

    @GET("api/subjects/{id}/learn/outline")
    suspend fun learnOutline(@Path("id") subjectId: String): LearnerOutlineDto

    @POST("api/subjects/{id}/learn/lessons/{slug}/start")
    suspend fun startLesson(@Path("id") subjectId: String, @Path("slug") slug: String): LessonStepResponseDto

    @GET("api/subjects/{id}/learn/lessons/{slug}/step")
    suspend fun currentLessonStep(@Path("id") subjectId: String, @Path("slug") slug: String): LessonStepResponseDto

    @POST("api/subjects/{id}/learn/lessons/{slug}/next")
    suspend fun lessonNext(@Path("id") subjectId: String, @Path("slug") slug: String): LessonStepResponseDto

    @POST("api/subjects/{id}/learn/lessons/{slug}/back")
    suspend fun lessonBack(@Path("id") subjectId: String, @Path("slug") slug: String): LessonStepResponseDto

    @POST("api/subjects/{id}/learn/lessons/{slug}/continue")
    suspend fun lessonContinue(@Path("id") subjectId: String, @Path("slug") slug: String): LessonStepResponseDto

    @POST("api/subjects/{id}/learn/lessons/{slug}/pause")
    suspend fun lessonPause(@Path("id") subjectId: String, @Path("slug") slug: String): LessonStepResponseDto

    @POST("api/subjects/{id}/learn/lessons/{slug}/answer")
    suspend fun lessonAnswer(
        @Path("id") subjectId: String,
        @Path("slug") slug: String,
        @Body body: AnswerRequest,
    ): LessonAnswerResponseDto

    @GET("api/subjects/{id}/learn/lessons/{slug}/screens")
    suspend fun lessonScreens(@Path("id") subjectId: String, @Path("slug") slug: String): LessonScreensDto

    @POST("api/subjects/{id}/learn/screens/{number}/comments")
    suspend fun commentOnScreen(
        @Path("id") subjectId: String,
        @Path("number") number: String,
        @Body body: CommentRequest,
    ): ScreenCommentDto

    @GET("api/subjects/{id}/learn/reviews")
    suspend fun dueReviews(@Path("id") subjectId: String): DueReviewsDto

    @POST("api/subjects/{id}/learn/reviews/{questionId}/start")
    suspend fun startReview(@Path("id") subjectId: String, @Path("questionId") questionId: String): ReviewStepResponseDto

    @POST("api/subjects/{id}/learn/reviews/{questionId}/continue")
    suspend fun continueReview(@Path("id") subjectId: String, @Path("questionId") questionId: String): ReviewStepResponseDto

    @POST("api/subjects/{id}/learn/reviews/{questionId}/answer")
    suspend fun answerReview(
        @Path("id") subjectId: String,
        @Path("questionId") questionId: String,
        @Body body: AnswerRequest,
    ): ReviewAnswerResponseDto
}
