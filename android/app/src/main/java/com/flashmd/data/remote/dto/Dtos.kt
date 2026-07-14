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
    val accountType: String? = null,
    val emailVerifiedAt: String? = null,
    val displayName: String? = null,
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
    @SerialName("is_public") val isPublic: Boolean = false,
    @SerialName("is_ordered") val isOrdered: Boolean = false,
    @SerialName("is_branching") val isBranching: Boolean = false,
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
    @SerialName("is_ordered") val isOrdered: Boolean = false,
    val cards: List<DeckCardDto> = emptyList(),
)

@Serializable
data class DeckCardDto(
    val id: String,
    val type: String = "basic",
    val content: DeckCardContentDto = DeckCardContentDto(),
    val category: String? = null,
    val position: Int = 0,
)

@Serializable
data class DeckCardContentDto(
    val front: String = "",
    val back: String = "",
    val prompt: String = "",
    val label: String? = null,
    val options: List<BranchOptionDto> = emptyList(),
)

@Serializable
data class BranchOptionDto(
    val text: String = "",
    val goto: String = "",
)

@Serializable
data class CardContentDto(
    val front: String = "",
    val back: String = "",
    // Spec 01: diagnostic cards also carry their anchor label and authored MC
    // options; absent for ordinary cards.
    val label: String? = null,
    val options: List<BranchOptionDto> = emptyList(),
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
    val viewed: Int = 0,
    val again: Int = 0,
    val hard: Int = 0,
    val good: Int = 0,
    val easy: Int = 0,
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

@Serializable
data class UpdateDeckRequest(
    val title: String? = null,
    val isPublic: Boolean? = null,
    val isOrdered: Boolean? = null,
)

@Serializable
data class AddCardsRequest(val markdown: String)

@Serializable
data class AddCardsResponse(
    @SerialName("deck_id") val deckId: String,
    val added: Int = 0,
)

@Serializable
data class MeResponse(val user: UserDto)

@Serializable
data class UpdateProfileRequest(val displayName: String)

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
)

@Serializable
data class BugReportRequest(
    val title: String,
    val description: String,
    val appVersion: String? = null,
    val platform: String? = null,
    val device: String? = null,
)

@Serializable
data class BugReportResponse(
    val issueUrl: String? = null,
)
