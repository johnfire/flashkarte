package com.flashmd.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

enum class CourseCollectionSource(val queryValue: String) {
    OFFICIAL("official"),
    COMMUNITY("community");

    companion object {
        fun fromRoute(value: String): CourseCollectionSource =
            entries.firstOrNull { it.queryValue == value }
                ?: throw IllegalArgumentException("Unknown course collection source")
    }
}

/** A public grouping of related structured courses. */
@Serializable
data class CourseCollectionDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("is_official") val isOfficial: Boolean,
    @SerialName("course_count") val courseCount: Int,
)

/** A public collection together with the structured courses a learner may add. */
@Serializable
data class CourseCollectionDetailDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("is_official") val isOfficial: Boolean,
    val courses: List<LearnSubjectDto> = emptyList(),
)
