package com.flashmd.data.db.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "category",
    foreignKeys = [ForeignKey(
        entity = DeckEntity::class,
        parentColumns = ["id"],
        childColumns = ["deckId"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("deckId")],
)
data class CategoryEntity(
    @PrimaryKey val id: String,
    val deckId: String,
    val name: String,
    val orderIndex: Int,
)
