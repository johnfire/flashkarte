package com.flashmd.data.db.daos

import androidx.room.*
import com.flashmd.data.db.entities.CardProgressEntity

data class DueCardRow(
    val cardId: String,
    val front: String,
    val back: String,
    val progressId: String,
    val easiness: Double,
    val interval: Int,
    val repetitions: Int,
    val dueDate: String,
    val lastReviewed: String?,
    val lastRating: Int?,
)

data class DeckStats(
    val total: Int,
    val due: Int,
)

@Dao
interface ProgressDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(progress: CardProgressEntity)

    @Query("""
        UPDATE card_progress
        SET easiness = :easiness,
            interval = :interval,
            repetitions = :repetitions,
            dueDate = :dueDate,
            lastReviewed = :lastReviewed,
            lastRating = :lastRating
        WHERE cardId = :cardId
    """)
    suspend fun update(
        cardId: String,
        easiness: Double,
        interval: Int,
        repetitions: Int,
        dueDate: String,
        lastReviewed: String,
        lastRating: Int,
    )

    @Query("SELECT * FROM card_progress WHERE cardId = :cardId")
    suspend fun getByCardId(cardId: String): CardProgressEntity?

    @Query("""
        SELECT c.id AS cardId, c.front, c.back,
               cp.id AS progressId, cp.easiness, cp.interval,
               cp.repetitions, cp.dueDate, cp.lastReviewed, cp.lastRating
        FROM card c
        JOIN card_progress cp ON cp.cardId = c.id
        WHERE c.deckId = :deckId
          AND cp.dueDate <= :today
        ORDER BY cp.dueDate ASC
    """)
    suspend fun getDueCards(deckId: String, today: String): List<DueCardRow>

    @Query("SELECT COUNT(*) FROM card WHERE deckId = :deckId")
    suspend fun totalCards(deckId: String): Int

    @Query("""
        SELECT COUNT(*) FROM card c
        JOIN card_progress cp ON cp.cardId = c.id
        WHERE c.deckId = :deckId AND cp.dueDate <= :today
    """)
    suspend fun dueCards(deckId: String, today: String): Int

    @Query("""
        SELECT lastRating, COUNT(*) as cnt
        FROM card_progress cp
        JOIN card c ON c.id = cp.cardId
        WHERE c.deckId = :deckId AND cp.lastRating IS NOT NULL
        GROUP BY lastRating
    """)
    suspend fun ratingCounts(deckId: String): List<RatingCount>
}

data class RatingCount(val lastRating: Int, val cnt: Int)
