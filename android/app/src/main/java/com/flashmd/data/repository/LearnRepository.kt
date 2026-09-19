package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
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
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Online-only, like [CourseRepository]. The server holds each learner's place and the rules of the
 * lesson loop, so the app is a renderer: it sends what the learner did and draws the step it gets
 * back. Nothing is cached, so there is nothing to sync or to disagree with the server.
 */
@Singleton
class LearnRepository @Inject constructor(private val api: FlashkarteApi) {
    suspend fun subjects(): List<LearnSubjectDto> = apiCall { api.listLearnSubjects() }

    suspend fun outline(subjectId: String): LearnerOutlineDto = apiCall { api.learnOutline(subjectId) }

    suspend fun start(subjectId: String, slug: String): LessonStepResponseDto =
        apiCall { api.startLesson(subjectId, slug) }

    suspend fun next(subjectId: String, slug: String): LessonStepResponseDto =
        apiCall { api.lessonNext(subjectId, slug) }

    suspend fun back(subjectId: String, slug: String): LessonStepResponseDto =
        apiCall { api.lessonBack(subjectId, slug) }

    suspend fun carryOn(subjectId: String, slug: String): LessonStepResponseDto =
        apiCall { api.lessonContinue(subjectId, slug) }

    suspend fun pause(subjectId: String, slug: String): LessonStepResponseDto =
        apiCall { api.lessonPause(subjectId, slug) }

    suspend fun answer(subjectId: String, slug: String, choice: Int): LessonAnswerResponseDto =
        apiCall { api.lessonAnswer(subjectId, slug, AnswerRequest(choice)) }

    suspend fun screens(subjectId: String, slug: String): LessonScreensDto =
        apiCall { api.lessonScreens(subjectId, slug) }

    suspend fun comment(subjectId: String, number: String, body: String): ScreenCommentDto =
        apiCall { api.commentOnScreen(subjectId, number, CommentRequest(body)) }

    suspend fun dueReviews(subjectId: String): DueReviewsDto = apiCall { api.dueReviews(subjectId) }

    suspend fun startReview(subjectId: String, questionId: String): ReviewStepResponseDto =
        apiCall { api.startReview(subjectId, questionId) }

    suspend fun carryOnReview(subjectId: String, questionId: String): ReviewStepResponseDto =
        apiCall { api.continueReview(subjectId, questionId) }

    suspend fun answerReview(subjectId: String, questionId: String, choice: Int): ReviewAnswerResponseDto =
        apiCall { api.answerReview(subjectId, questionId, AnswerRequest(choice)) }
}
