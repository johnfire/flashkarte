package com.flashmd.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CredentialsRequest(
    val email: String,
    val password: String,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val role: String,
)

@Serializable
data class AuthResponse(
    val user: UserDto,
    val accessToken: String,
    val expiresIn: Int = 0,
)

@Serializable
data class RefreshResponse(
    val accessToken: String,
)

/**
 * Deck list item. Postgres `count(*)` comes back as a JSON string, so
 * `card_count` / `due_count` are strings here (parsed to Int in the mapper).
 */
@Serializable
data class DeckListItemDto(
    val id: String,
    val title: String,
    @SerialName("source_filename") val sourceFilename: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("card_count") val cardCount: String = "0",
    @SerialName("due_count") val dueCount: String = "0",
)

/** Response from POST /api/decks — here `card_count` is a real number. */
@Serializable
data class DeckCreatedDto(
    val id: String,
    val title: String,
    @SerialName("card_count") val cardCount: Int = 0,
)

@Serializable
data class DeckDetailDto(
    val id: String,
    val title: String,
    @SerialName("source_filename") val sourceFilename: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class CardContentDto(
    val front: String = "",
    val back: String = "",
)

@Serializable
data class StudyCardDto(
    val id: String,
    val content: CardContentDto,
    val category: String? = null,
)

@Serializable
data class StatsDto(
    val total: Int = 0,
    @SerialName("new") val newCount: Int = 0,
    val due: Int = 0,
    val learned: Int = 0,
)

@Serializable
data class ImportRequest(
    val markdown: String,
    val title: String? = null,
)

@Serializable
data class ReviewRequest(
    @SerialName("card_id") val cardId: String,
    val rating: Int,
)

@Serializable
data class ReviewResponseDto(
    @SerialName("card_id") val cardId: String = "",
)

@Serializable
data class ClientErrorRequest(
    val app: String,
    val message: String,
    val appVersion: String? = null,
    val platform: String? = null,
    val context: String? = null,
    val stack: String? = null,
)

/** Server error envelope: `{ "error": { "code", "message" } }`. */
@Serializable
data class ApiErrorEnvelope(
    val error: ApiErrorBody? = null,
)

@Serializable
data class ApiErrorBody(
    val code: String = "ERROR",
    val message: String = "",
)
