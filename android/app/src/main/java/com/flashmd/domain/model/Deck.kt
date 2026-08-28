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
    val isPublic: Boolean = false,
    val isOrdered: Boolean = false,
    // Speech overrides (Spec 09). All null means "inherit the global default";
    // speechEnabled is tri-state — null inherit / true on / false muted.
    val speechEnabled: Boolean? = null,
    val speechFrontLang: String? = null,
    val speechBackLang: String? = null,
    val speechAutoplay: String? = null,
    val speechRate: Double? = null,
    val isBranching: Boolean = false,
)
