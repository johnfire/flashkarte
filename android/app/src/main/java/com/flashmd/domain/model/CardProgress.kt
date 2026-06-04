package com.flashmd.domain.model

data class CardProgress(
    val id: String,
    val cardId: String,
    val easiness: Double,
    val interval: Int,
    val repetitions: Int,
    val dueDate: String,
    val lastReviewed: String?,
    val lastRating: Int?,
)

data class DueCard(
    val card: Card,
    val progress: CardProgress,
)
