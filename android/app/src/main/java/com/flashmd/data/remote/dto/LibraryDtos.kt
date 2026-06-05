package com.flashmd.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class LibraryDeckDto(
    val id: String,
    val title: String,
    val author: String? = null,
    val cardCount: Int = 0,
    val publishedAt: String? = null,
)

@Serializable
data class LibraryListResponse(val decks: List<LibraryDeckDto> = emptyList())

@Serializable
data class LibraryDeckDetailDto(
    val id: String,
    val title: String,
    val author: String? = null,
    val cardCount: Int = 0,
    val publishedAt: String? = null,
    val cards: List<CardContentDto> = emptyList(),
)
