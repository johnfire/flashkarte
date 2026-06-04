package com.flashmd.domain.model

data class Deck(
    val id: String,
    val title: String,
    val sourceFile: String,
    val createdAt: String,
    val lastStudied: String?,
    // Joined stats
    val totalCards: Int = 0,
    val dueCount: Int = 0,
)
