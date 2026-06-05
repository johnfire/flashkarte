package com.flashmd.data.local

import com.flashmd.db.FlashkarteDb
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.sm2.Sm2Algorithm
import com.flashmd.domain.sm2.Sm2Progress
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * SQLDelight-backed local mirror of decks/cards/progress. Enables offline study:
 * the due batch is cached on a successful online fetch, ratings are applied
 * locally via SM-2, and the server later overwrites progress on sync.
 */
@Singleton
class LocalStudyStore @Inject constructor(
    private val db: FlashkarteDb,
) {
    fun cacheDecks(decks: List<Deck>) = db.transaction {
        decks.forEach { d ->
            db.decksQueries.upsertDeck(
                d.id, d.title, d.sourceFile, d.createdAt, d.lastStudied, d.totalCards.toLong(),
            )
        }
    }

    fun cachedDecks(): List<Deck> =
        db.decksQueries.selectAllDecks().executeAsList().map {
            Deck(
                id = it.id,
                title = it.title,
                sourceFile = it.source_file ?: "",
                createdAt = it.created_at ?: "",
                lastStudied = it.last_studied,
                totalCards = it.total_cards.toInt(),
            )
        }

    /** Replace the cached cards for a deck (used after an online fetch of the due batch). */
    fun cacheDeckCards(deckId: String, cards: List<Card>) = db.transaction {
        db.cardsQueries.deleteCardsForDeck(deckId)
        cards.forEachIndexed { i, c ->
            db.cardsQueries.upsertCard(c.id, deckId, c.front, c.back, null, i.toLong())
        }
    }

    fun cacheProgress(p: CardProgress) {
        db.cardProgressQueries.upsertProgress(
            p.cardId,
            p.easiness,
            p.interval.toLong(),
            p.repetitions.toLong(),
            p.dueDate.ifEmpty { null },
            p.lastReviewed,
            p.lastRating?.toLong(),
        )
    }

    fun dueCards(deckId: String): List<DueCard> {
        val nowIso = Instant.now().toString()
        return db.cardProgressQueries.selectDueCards(deckId, nowIso).executeAsList().map { c ->
            val p = db.cardProgressQueries.selectProgress(c.id).executeAsOneOrNull()
            DueCard(
                card = Card(c.id, c.deck_id, c.front, c.back),
                progress = CardProgress(
                    id = c.id,
                    cardId = c.id,
                    easiness = p?.easiness ?: 2.5,
                    interval = (p?.interval_days ?: 0L).toInt(),
                    repetitions = (p?.repetitions ?: 0L).toInt(),
                    dueDate = p?.due_at ?: "",
                    lastReviewed = p?.last_reviewed_at,
                    lastRating = p?.last_rating?.toInt(),
                ),
            )
        }
    }

    /** Apply a rating locally via SM-2 and persist the new progress. Returns the new due ISO date. */
    fun applyRatingLocally(cardId: String, rating: Int, reviewedAtIso: String): String {
        val prev = db.cardProgressQueries.selectProgress(cardId).executeAsOneOrNull()
        val current = Sm2Progress(
            easiness = prev?.easiness ?: 2.5,
            interval = (prev?.interval_days ?: 0L).toInt(),
            repetitions = (prev?.repetitions ?: 0L).toInt(),
        )
        val next = Sm2Algorithm.calculate(current, rating)
        val dueIso = Instant.parse(reviewedAtIso)
            .plusSeconds(next.interval.toLong() * 86_400L)
            .toString()
        db.cardProgressQueries.upsertProgress(
            cardId,
            next.easiness,
            next.interval.toLong(),
            next.repetitions.toLong(),
            dueIso,
            reviewedAtIso,
            rating.toLong(),
        )
        return dueIso
    }
}
