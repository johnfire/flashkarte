package com.flashmd.data.repository

import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.DeckListItemDto
import com.flashmd.data.remote.dto.DeckSettingsDto
import com.flashmd.data.remote.dto.ImportRequest
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DeckNode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
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
                        isOrdered = it.isOrdered,
                        speechEnabled = it.speechEnabled,
                        speechFrontLang = it.speechFrontLang,
                        speechBackLang = it.speechBackLang,
                        speechAutoplay = it.speechAutoplay,
                        speechRate = it.speechRate,
                        isBranching = it.cards.any { c -> c.type == "branch" },
                    )
                }
            }.getOrNull()
    }

    suspend fun getDeckGraph(id: String): List<DeckNode> =
        apiCall { api.getDeck(id) }.cards.map { c ->
            DeckNode(
                id = c.id,
                type = c.type,
                label = c.content.label,
                prompt = if (c.type == "branch") c.content.prompt else c.content.front,
                back = c.content.back,
                options = c.content.options.map { o -> BranchOption(o.text, o.goto) },
                position = c.position,
            )
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

    suspend fun setOrdered(id: String, isOrdered: Boolean) {
        apiCall { api.updateDeck(id, com.flashmd.data.remote.dto.UpdateDeckRequest(isOrdered = isOrdered)) }
        refresh()
    }

    suspend fun getSpeechSettings(id: String): DeckSettingsDto =
        apiCall { api.getDeckSettings(id) }

    /**
     * Write this deck's speech overrides.
     *
     * Every field is sent on every save, with null encoded explicitly so the
     * server resets it to "inherit the global default" — the tri-state on/off
     * control depends on being able to say null out loud.
     */
    suspend fun setSpeech(
        id: String,
        enabled: Boolean?,
        frontLang: String?,
        backLang: String?,
        autoplay: String?,
        rate: Double?,
    ) {
        val body = buildJsonObject {
            put("speechEnabled", enabled?.let { JsonPrimitive(it) } ?: JsonNull)
            put("speechFrontLang", frontLang?.let { JsonPrimitive(it) } ?: JsonNull)
            put("speechBackLang", backLang?.let { JsonPrimitive(it) } ?: JsonNull)
            put("speechAutoplay", autoplay?.let { JsonPrimitive(it) } ?: JsonNull)
            put("speechRate", rate?.let { JsonPrimitive(it) } ?: JsonNull)
        }
        apiCall { api.updateDeckSpeech(id, body) }
        refresh()
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
        isOrdered = isOrdered,
        speechEnabled = speechEnabled,
        speechFrontLang = speechFrontLang,
        speechBackLang = speechBackLang,
        speechAutoplay = speechAutoplay,
        speechRate = speechRate,
        isBranching = isBranching,
    )
}
