package com.flashmd.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SyncEventDto(
    val event_id: String,
    val card_id: String,
    val rating: Int,
    val reviewed_at: String,
    // Spec 01: index of the picked diagnostic option; null for flip/ordinary
    // reviews. The server accepts the field absent or null (old clients).
    val option_index: Int? = null,
)

@Serializable
data class SyncRequest(val events: List<SyncEventDto>)

@Serializable
data class SyncProgressDto(
    val card_id: String,
    val easiness: Double,
    val interval: Int,
    val repetitions: Int,
    val due_at: String,
    @SerialName("last_rating") val lastRating: Int? = null,
)

@Serializable
data class SyncResponse(
    val acked_event_ids: List<String>,
    val progress: List<SyncProgressDto>,
)
