package com.flashmd.data.db.daos

import androidx.room.*
import com.flashmd.data.db.entities.DeckEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DeckDao {
    @Query("SELECT * FROM deck ORDER BY title")
    fun getAllFlow(): Flow<List<DeckEntity>>

    @Query("SELECT * FROM deck WHERE id = :id")
    suspend fun getById(id: String): DeckEntity?

    @Query("SELECT * FROM deck WHERE title = :title")
    suspend fun getByTitle(title: String): DeckEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(deck: DeckEntity)

    @Query("UPDATE deck SET lastStudied = :ts WHERE id = :id")
    suspend fun updateLastStudied(id: String, ts: String)

    @Query("DELETE FROM deck WHERE id = :id")
    suspend fun deleteById(id: String)
}
