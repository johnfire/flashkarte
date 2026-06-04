package com.flashmd.data.db.daos

import androidx.room.*
import com.flashmd.data.db.entities.CardEntity
import com.flashmd.data.db.entities.CategoryEntity

@Dao
interface CardDao {

    // ── Category ──────────────────────────────────────────────────────────────

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Query("DELETE FROM category WHERE deckId = :deckId")
    suspend fun deleteCategories(deckId: String)

    @Query("SELECT * FROM category WHERE deckId = :deckId ORDER BY orderIndex")
    suspend fun getCategories(deckId: String): List<CategoryEntity>

    // ── Card ──────────────────────────────────────────────────────────────────

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertCard(card: CardEntity)

    @Query("SELECT * FROM card WHERE deckId = :deckId ORDER BY rowid")
    suspend fun getCards(deckId: String): List<CardEntity>

    @Query("SELECT * FROM card WHERE deckId = :deckId AND front = :front")
    suspend fun getCardByFront(deckId: String, front: String): CardEntity?

    @Query("UPDATE card SET back = :back WHERE id = :cardId")
    suspend fun updateBack(cardId: String, back: String)

    @Query("SELECT COUNT(*) FROM card WHERE deckId = :deckId")
    suspend fun countCards(deckId: String): Int

    @Query("""
        DELETE FROM card
        WHERE deckId = :deckId
          AND front NOT IN (:keepFronts)
    """)
    suspend fun deleteCardsNotIn(deckId: String, keepFronts: List<String>)
}
