package com.flashmd.data.repository

import com.flashmd.data.db.daos.ProgressDao
import com.flashmd.data.db.daos.RatingCount
import com.flashmd.data.parser.MdParser
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.sm2.Sm2Algorithm
import com.flashmd.domain.sm2.Sm2Progress
import java.time.LocalDate
import java.time.ZonedDateTime
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudyRepository @Inject constructor(
    private val progressDao: ProgressDao,
) {
    suspend fun getDueCards(deckId: String): List<DueCard> {
        val today = LocalDate.now().toString()
        return progressDao.getDueCards(deckId, today).map { row ->
            DueCard(
                card = Card(row.cardId, deckId, row.front, row.back),
                progress = CardProgress(
                    id = row.progressId,
                    cardId = row.cardId,
                    easiness = row.easiness,
                    interval = row.interval,
                    repetitions = row.repetitions,
                    dueDate = row.dueDate,
                    lastReviewed = row.lastReviewed,
                    lastRating = row.lastRating,
                )
            )
        }
    }

    suspend fun applyRating(cardId: String, rating: Int) {
        val row = progressDao.getByCardId(cardId) ?: return
        val result = Sm2Algorithm.calculate(
            Sm2Progress(row.easiness, row.interval, row.repetitions),
            rating,
        )
        val newDue = LocalDate.now().plusDays(result.interval.toLong()).toString()
        progressDao.update(
            cardId = cardId,
            easiness = result.easiness,
            interval = result.interval,
            repetitions = result.repetitions,
            dueDate = newDue,
            lastReviewed = ZonedDateTime.now().toString(),
            lastRating = rating,
        )
    }

    suspend fun getStats(deckId: String): DeckStudyStats {
        val today = LocalDate.now().toString()
        val total = progressDao.totalCards(deckId)
        val due = progressDao.dueCards(deckId, today)
        val counts = progressDao.ratingCounts(deckId).associate { it.lastRating to it.cnt }
        return DeckStudyStats(total, due, counts)
    }
}

data class DeckStudyStats(
    val total: Int,
    val due: Int,
    val ratingCounts: Map<Int, Int>,
)
