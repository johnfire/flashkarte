package com.flashmd.data.repository

import com.flashmd.data.db.daos.CardDao
import com.flashmd.data.db.daos.DeckDao
import com.flashmd.data.db.daos.ProgressDao
import com.flashmd.data.db.entities.CardEntity
import com.flashmd.data.db.entities.CardProgressEntity
import com.flashmd.data.db.entities.CategoryEntity
import com.flashmd.data.db.entities.DeckEntity
import com.flashmd.data.parser.ParsedDeck
import com.flashmd.domain.model.Deck
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.time.ZonedDateTime
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeckRepository @Inject constructor(
    private val deckDao: DeckDao,
    private val cardDao: CardDao,
    private val progressDao: ProgressDao,
) {
    fun getAllDecksFlow(): Flow<List<Deck>> = deckDao.getAllFlow().map { entities ->
        entities.map { it.toDomain() }
    }

    suspend fun getDeckById(id: String): Deck? = deckDao.getById(id)?.toDomain()

    suspend fun deckExistsByTitle(title: String): Boolean =
        deckDao.getByTitle(title) != null

    /**
     * Import a parsed deck. If a deck with the same title already exists,
     * only reset progress for cards whose back changed or are new.
     * Cards removed from the file are deleted.
     */
    suspend fun importDeck(parsed: ParsedDeck) {
        val now = ZonedDateTime.now().toString()
        val tomorrow = LocalDate.now().plusDays(1).toString()

        val existing = deckDao.getByTitle(parsed.title)
        val deckId = existing?.id ?: UUID.randomUUID().toString()

        if (existing == null) {
            deckDao.insert(DeckEntity(deckId, parsed.title, parsed.sourceFile, now))
        }

        // Rebuild categories
        cardDao.deleteCategories(deckId)
        val seenCategories = mutableMapOf<String, String>()
        val categoryMap = mutableMapOf<String?, String?>()
        categoryMap[null] = null

        for ((idx, card) in parsed.cards.withIndex()) {
            val cat = card.category ?: continue
            if (cat !in seenCategories) {
                val catId = UUID.randomUUID().toString()
                seenCategories[cat] = catId
                cardDao.insertCategory(
                    CategoryEntity(catId, deckId, cat, seenCategories.size - 1)
                )
            }
            categoryMap[cat] = seenCategories[cat]
        }

        // Sync cards
        val newFronts = parsed.cards.map { it.front }
        cardDao.deleteCardsNotIn(deckId, newFronts)

        for (parsedCard in parsed.cards) {
            val catId = categoryMap[parsedCard.category]
            val existingCard = cardDao.getCardByFront(deckId, parsedCard.front)

            val cardId: String
            val needsProgressReset: Boolean

            if (existingCard == null) {
                cardId = UUID.randomUUID().toString()
                cardDao.insertCard(
                    CardEntity(cardId, deckId, catId, parsedCard.front, parsedCard.back, now)
                )
                needsProgressReset = true
            } else {
                cardId = existingCard.id
                if (existingCard.back != parsedCard.back) {
                    cardDao.updateBack(cardId, parsedCard.back)
                    needsProgressReset = true
                } else {
                    needsProgressReset = false
                }
            }

            if (needsProgressReset) {
                val existingProgress = progressDao.getByCardId(cardId)
                if (existingProgress == null) {
                    progressDao.insert(
                        CardProgressEntity(
                            id = UUID.randomUUID().toString(),
                            cardId = cardId,
                            dueDate = tomorrow,
                        )
                    )
                } else {
                    progressDao.insert(
                        existingProgress.copy(
                            easiness = 2.5,
                            interval = 0,
                            repetitions = 0,
                            dueDate = tomorrow,
                            lastReviewed = null,
                            lastRating = null,
                        )
                    )
                }
            }
        }
    }

    suspend fun deleteDeck(id: String) = deckDao.deleteById(id)

    suspend fun updateLastStudied(id: String) =
        deckDao.updateLastStudied(id, ZonedDateTime.now().toString())

    private fun DeckEntity.toDomain() = Deck(
        id = id,
        title = title,
        sourceFile = sourceFile,
        createdAt = createdAt,
        lastStudied = lastStudied,
    )
}
