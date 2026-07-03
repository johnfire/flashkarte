package com.flashmd.data.repository

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToOne
import com.flashmd.data.local.EventFactory
import com.flashmd.db.FlashkarteDb
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

data class ReviewEvent(
    val eventId: String,
    val cardId: String,
    val rating: Int,
    val reviewedAt: String,
    // Spec 01: picked diagnostic option index; null for flip/ordinary reviews.
    val optionIndex: Int? = null,
)

@Singleton
class OutboxRepository @Inject constructor(
    private val db: FlashkarteDb,
    private val events: EventFactory,
) {
    /** Enqueue a rating as a pending sync event and return it. */
    fun enqueue(cardId: String, rating: Int, optionIndex: Int? = null): ReviewEvent {
        val ev = ReviewEvent(events.newId(), cardId, rating, events.nowIso(), optionIndex)
        db.outboxQueries.enqueue(
            ev.eventId,
            ev.cardId,
            ev.rating.toLong(),
            ev.reviewedAt,
            events.nowIso(),
            ev.optionIndex?.toLong(),
        )
        return ev
    }

    fun pending(): List<ReviewEvent> =
        db.outboxQueries.selectAll().executeAsList().map {
            ReviewEvent(
                it.event_id,
                it.card_id,
                it.rating.toInt(),
                it.reviewed_at,
                it.option_index?.toInt(),
            )
        }

    fun ack(eventIds: List<String>) {
        if (eventIds.isNotEmpty()) db.outboxQueries.deleteByIds(eventIds)
    }

    fun pendingCount(): Flow<Long> =
        db.outboxQueries.countAll().asFlow().mapToOne(Dispatchers.IO)
}
