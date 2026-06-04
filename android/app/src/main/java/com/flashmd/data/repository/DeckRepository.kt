package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.DeckListItemDto
import com.flashmd.data.remote.dto.ImportRequest
import com.flashmd.domain.model.Deck
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * API-backed deck repository. The server is the source of truth; the deck list
 * is cached in a [MutableStateFlow] and refreshed explicitly (online-first v1).
 * The list endpoint already returns per-deck card/due counts, so no per-deck
 * stats round-trips are needed.
 */
@Singleton
class DeckRepository @Inject constructor(
    private val api: FlashkarteApi,
) {
    private val decks = MutableStateFlow<List<Deck>>(emptyList())

    fun getAllDecksFlow(): Flow<List<Deck>> = decks.asStateFlow()

    /** Reloads the deck list from the server into the cached flow. */
    suspend fun refresh() {
        decks.value = apiCall { api.listDecks() }.map { it.toDomain() }
    }

    suspend fun getDeckById(id: String): Deck? {
        return decks.value.firstOrNull { it.id == id }
            ?: runCatching {
                apiCall { api.getDeck(id) }.let {
                    Deck(
                        id = it.id,
                        title = it.title,
                        sourceFile = it.sourceFilename ?: "",
                        createdAt = it.createdAt,
                        lastStudied = it.updatedAt,
                    )
                }
            }.getOrNull()
    }

    /**
     * Imports a deck from raw Markdown. The server parses it (single source of
     * truth) and creates the deck. Returns the number of cards created.
     */
    suspend fun importMarkdown(markdown: String, title: String?): Int {
        val created = apiCall { api.importDeck(ImportRequest(markdown, title)) }
        refresh()
        return created.cardCount
    }

    suspend fun deleteDeck(id: String) {
        apiCall { api.deleteDeck(id) }
        decks.value = decks.value.filterNot { it.id == id }
    }

    private fun DeckListItemDto.toDomain() = Deck(
        id = id,
        title = title,
        sourceFile = sourceFilename ?: "",
        createdAt = createdAt,
        lastStudied = updatedAt,
        totalCards = cardCount.toIntOrNull() ?: 0,
        dueCount = dueCount.toIntOrNull() ?: 0,
    )
}
