package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.AddDeckToCourseRequest
import com.flashmd.data.remote.dto.CloneCourseResponse
import com.flashmd.data.remote.dto.CourseDetailDto
import com.flashmd.data.remote.dto.CourseSummaryDto
import com.flashmd.data.remote.dto.CreateCourseRequest
import com.flashmd.data.remote.dto.PublicCourseDetailDto
import com.flashmd.data.remote.dto.PublicCourseSummaryDto
import com.flashmd.data.remote.dto.ReorderCourseDecksRequest
import com.flashmd.data.remote.dto.UpdateCourseRequest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Online-only, like [LibraryRepository] -- a course is browsable/manageable
 * structure, not offline flashcard study data. Studying a deck inside a
 * course still goes through the ordinary offline-first [StudyRepository].
 */
@Singleton
class CourseRepository @Inject constructor(
    private val api: FlashkarteApi,
) {
    suspend fun list(): List<CourseSummaryDto> = apiCall { api.listCourses() }

    suspend fun create(title: String, description: String?): CourseSummaryDto =
        apiCall { api.createCourse(CreateCourseRequest(title, description)) }

    suspend fun get(id: String): CourseDetailDto = apiCall { api.getCourse(id) }

    suspend fun setPublic(id: String, isPublic: Boolean): CourseSummaryDto =
        apiCall { api.updateCourse(id, UpdateCourseRequest(isPublic = isPublic)) }

    suspend fun delete(id: String) {
        apiCall { api.deleteCourse(id) }
    }

    suspend fun addDeck(courseId: String, deckId: String) {
        apiCall { api.addDeckToCourse(courseId, AddDeckToCourseRequest(deckId)) }
    }

    suspend fun removeDeck(courseId: String, deckId: String) {
        apiCall { api.removeDeckFromCourse(courseId, deckId) }
    }

    suspend fun reorderDecks(courseId: String, deckIds: List<String>) {
        apiCall { api.reorderCourseDecks(courseId, ReorderCourseDecksRequest(deckIds)) }
    }

    suspend fun listPublic(): List<PublicCourseSummaryDto> = apiCall { api.listPublicCourses() }

    suspend fun getPublic(id: String): PublicCourseDetailDto = apiCall { api.getPublicCourse(id) }

    suspend fun clone(id: String): CloneCourseResponse = apiCall { api.cloneCourse(id) }
}
