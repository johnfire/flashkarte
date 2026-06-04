package com.flashmd.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.flashmd.data.db.daos.CardDao
import com.flashmd.data.db.daos.DeckDao
import com.flashmd.data.db.daos.ProgressDao
import com.flashmd.data.db.entities.CardEntity
import com.flashmd.data.db.entities.CardProgressEntity
import com.flashmd.data.db.entities.CategoryEntity
import com.flashmd.data.db.entities.DeckEntity

@Database(
    entities = [DeckEntity::class, CategoryEntity::class, CardEntity::class, CardProgressEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class FlashMdDatabase : RoomDatabase() {
    abstract fun deckDao(): DeckDao
    abstract fun cardDao(): CardDao
    abstract fun progressDao(): ProgressDao
}
