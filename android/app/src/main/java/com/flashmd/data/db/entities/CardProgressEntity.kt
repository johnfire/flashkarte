package com.flashmd.data.db.entities

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "card_progress",
    foreignKeys = [ForeignKey(
        entity = CardEntity::class,
        parentColumns = ["id"],
        childColumns = ["cardId"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("cardId", unique = true)],
)
data class CardProgressEntity(
    @PrimaryKey val id: String,
    val cardId: String,
    val easiness: Double = 2.5,
    val interval: Int = 0,
    val repetitions: Int = 0,
    val dueDate: String,
    val lastReviewed: String? = null,
    val lastRating: Int? = null,
)
