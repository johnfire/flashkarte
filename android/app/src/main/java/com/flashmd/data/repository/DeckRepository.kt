package com.flashmd.data.repository

import com.flashmd.data.local.LocalStudyStore
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
 * Deck repository. The server is the source of truth; the deck list is cached in
 * a [MutableStateFlow] and refreshed explicitly. On a successful refresh the list
 * is also mirrored to the local store so it survives offline; when the network is
 * unavailable, [refresh] falls back to the cached decks.
 */
@Singleton
class DeckRepository @Inject constructor(
    private val api: FlashkarteApi,
    private val local: LocalStudyStore,
) {
    private val decks = MutableStateFlow<List<Deck>>(emptyList())

    fun getAllDecksFlow(): Flow<List<Deck>> = decks.asStateFlow()

    /** Reloads the deck list from the server, mirrors it locally, and falls back
     *  to the local mirror when offline. */
    suspend fun refresh() {
        try {
            val fresh = apiCall { api.listDecks() }.map { it.toDomain() }
            decks.value = fresh
            local.cacheDecks(fresh)
        } catch (e: Exception) {
            val cached = local.cachedDecks()
            if (cached.isNotEmpty()) decks.value = cached else throw e
        }
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

    suspend fun renameDeck(id: String, title: String) {
        apiCall { api.updateDeck(id, com.flashmd.data.remote.dto.UpdateDeckRequest(title = title)) }
        refresh()
    }

    suspend fun setPublic(id: String, isPublic: Boolean) {
        apiCall { api.updateDeck(id, com.flashmd.data.remote.dto.UpdateDeckRequest(isPublic = isPublic)) }
        refresh()
    }

    suspend fun addCards(id: String, markdown: String): Int {
        val res = apiCall { api.addCards(id, com.flashmd.data.remote.dto.AddCardsRequest(markdown)) }
        refresh()
        return res.added
    }

    private fun DeckListItemDto.toDomain() = Deck(
        id = id,
        title = title,
        sourceFile = sourceFilename ?: "",
        createdAt = createdAt,
        lastStudied = updatedAt,
        totalCards = cardCount.toIntOrNull() ?: 0,
        dueCount = dueCount.toIntOrNull() ?: 0,
        isPublic = isPublic,
    )
}
