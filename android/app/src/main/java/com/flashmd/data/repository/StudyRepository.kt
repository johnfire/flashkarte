package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.ReviewRequest
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.DueCard
import javax.inject.Inject
import javax.inject.Singleton

/**
 * API-backed study repository. The server runs SM-2 and owns all scheduling;
 * the client just fetches the due batch and posts ratings. Progress fields on
 * [DueCard] are placeholders — the UI only needs the card content, and the
 * server returns the authoritative next-due on review.
 */
@Singleton
class StudyRepository @Inject constructor(
    private val api: FlashkarteApi,
) {
    suspend fun getDueCards(deckId: String): List<DueCard> {
        return apiCall { api.studyBatch(deckId) }.map { dto ->
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
    }

    suspend fun applyRating(cardId: String, rating: Int) {
        apiCall { api.review(ReviewRequest(cardId, rating)) }
    }

    suspend fun getStats(deckId: String): DeckStudyStats {
        val s = apiCall { api.stats(deckId) }
        return DeckStudyStats(
            total = s.total,
            new = s.newCount,
            due = s.due,
            learned = s.learned,
        )
    }
}

data class DeckStudyStats(
    val total: Int,
    val new: Int,
    val due: Int,
    val learned: Int,
)
