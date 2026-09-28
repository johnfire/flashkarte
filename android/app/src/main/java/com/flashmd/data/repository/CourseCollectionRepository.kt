package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.CourseCollectionDetailDto
import com.flashmd.data.remote.dto.CourseCollectionDto
import com.flashmd.data.remote.dto.CourseLanguageFilter
import com.flashmd.data.remote.dto.CourseCollectionSource
import com.flashmd.data.remote.dto.LearnSubjectDto
import javax.inject.Inject
import javax.inject.Singleton

/** Reads public structured-course collections and enrols the signed-in learner in a course. */
@Singleton
class CourseCollectionRepository @Inject constructor(
    private val api: FlashkarteApi,
) {
    suspend fun list(
        source: CourseCollectionSource,
        language: CourseLanguageFilter,
    ): List<CourseCollectionDto> =
        apiCall { api.listCourseCollections(source.queryValue, language.queryValue) }

    suspend fun get(
        collectionId: String,
        source: CourseCollectionSource,
        language: CourseLanguageFilter,
    ): CourseCollectionDetailDto =
        apiCall { api.getCourseCollection(collectionId, source.queryValue, language.queryValue) }

    suspend fun listUngrouped(
        source: CourseCollectionSource,
        language: CourseLanguageFilter,
    ): List<LearnSubjectDto> =
        apiCall { api.listUngroupedCourseCatalog(source.queryValue, language.queryValue) }

    suspend fun enroll(subjectId: String): Unit =
        apiCall { api.enrollInCourse(subjectId) }
}
