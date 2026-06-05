package com.flashmd.data.repository

import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.DueCard
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Offline-first study repository. When online, the due batch is fetched from the
 * server and cached locally; when offline, the cached batch is used. Ratings are
 * applied locally via SM-2 and enqueued to the outbox; the sync worker drains the
 * outbox to the server (the authoritative SM-2 source) on connectivity.
 */
@Singleton
class StudyRepository @Inject constructor(
    private val api: FlashkarteApi,
    private val local: LocalStudyStore,
    private val outbox: OutboxRepository,
) {
    suspend fun getDueCards(deckId: String): List<DueCard> {
        return try {
            val due = apiCall { api.studyBatch(deckId) }.map { dto ->
                DueCard(
                    card = Card(dto.id, deckId, dto.content.front, dto.content.back),
                    progress = CardProgress(
                        id = dto.id,
                        cardId = dto.id,
                        easiness = 2.5,
                        interval = 0,
                        repetitions = 0,
                        dueDate = "",
                        lastReviewed = null,
                        lastRating = null,
                    ),
                )
            }
            // Cache the fetched cards so this batch can be studied offline.
            local.cacheDeckCards(deckId, due.map { it.card })
            due
        } catch (e: Exception) {
            val cached = local.dueCards(deckId)
            if (cached.isNotEmpty()) cached else throw e
        }
    }

    /** Offline-first: apply SM-2 locally and enqueue a sync event for the worker to drain. */
    suspend fun applyRating(cardId: String, rating: Int) {
        val ev = outbox.enqueue(cardId, rating)
        local.applyRatingLocally(cardId, rating, ev.reviewedAt)
    }

    suspend fun getStats(deckId: String): DeckStudyStats {
        val s = apiCall { api.stats(deckId) }
        return DeckStudyStats(
            total = s.total,
            new = s.newCount,
            due = s.due,
            learned = s.learned,
            viewed = s.viewed,
            again = s.again,
            hard = s.hard,
            good = s.good,
            easy = s.easy,
        )
    }
}

data class DeckStudyStats(
    val total: Int,
    val new: Int,
    val due: Int,
    val learned: Int,
    val viewed: Int = 0,
    val again: Int = 0,
    val hard: Int = 0,
    val good: Int = 0,
    val easy: Int = 0,
)
