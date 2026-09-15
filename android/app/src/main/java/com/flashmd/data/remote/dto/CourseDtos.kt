package com.flashmd.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourseDto(
    val id: String,
    @SerialName("user_id") val userId: String,
    val title: String,
    val description: String? = null,
    @SerialName("is_public") val isPublic: Boolean = false,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

/** A course as listed on "My Courses" -- a summary, not its full deck list. */
@Serializable
data class CourseSummaryDto(
    val id: String,
    @SerialName("user_id") val userId: String,
    val title: String,
    val description: String? = null,
    @SerialName("is_public") val isPublic: Boolean = false,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("decks_total") val decksTotal: Int = 0,
    @SerialName("decks_mastered") val decksMastered: Int = 0,
)

/** One member deck of a course, with the gating state Study needs. */
@Serializable
data class CourseDeckDto(
    @SerialName("deck_id") val deckId: String,
    val position: Int,
    val title: String,
    @SerialName("card_count") val cardCount: Int = 0,
    @SerialName("mastered_count") val masteredCount: Int = 0,
    val mastered: Boolean = false,
    val locked: Boolean = false,
)

@Serializable
data class CourseDetailDto(
    val id: String,
    @SerialName("user_id") val userId: String,
    val title: String,
    val description: String? = null,
    @SerialName("is_public") val isPublic: Boolean = false,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
    val decks: List<CourseDeckDto> = emptyList(),
)

@Serializable
data class CreateCourseRequest(val title: String, val description: String? = null)

@Serializable
data class UpdateCourseRequest(
    val title: String? = null,
    val description: String? = null,
    val isPublic: Boolean? = null,
)

@Serializable
data class AddDeckToCourseRequest(@SerialName("deck_id") val deckId: String)

@Serializable
data class ReorderCourseDecksRequest(val order: List<String>)

/** A public course's member deck, before the caller owns any of it -- no
 *  lock/progress state, just what's in it. */
@Serializable
data class PublicCourseDeckDto(
    @SerialName("deck_id") val deckId: String,
    val position: Int,
    val title: String,
    @SerialName("card_count") val cardCount: Int = 0,
)

@Serializable
data class PublicCourseSummaryDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("decks_total") val decksTotal: Int = 0,
)

@Serializable
data class PublicCourseDetailDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val decks: List<PublicCourseDeckDto> = emptyList(),
)

@Serializable
data class CloneCourseResponse(
    val course: CourseDto,
    @SerialName("decks_cloned") val decksCloned: Int,
    @SerialName("source_id") val sourceId: String,
)
