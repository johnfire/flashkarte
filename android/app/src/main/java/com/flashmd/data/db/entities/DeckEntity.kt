package com.flashmd.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "deck")
data class DeckEntity(
    @PrimaryKey val id: String,
    val title: String,
    val sourceFile: String,
    val createdAt: String,
    val lastStudied: String? = null,
)
