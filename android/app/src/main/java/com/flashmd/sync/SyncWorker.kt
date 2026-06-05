package com.flashmd.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.SyncEventDto
import com.flashmd.data.remote.dto.SyncRequest
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.domain.model.CardProgress
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

/**
 * Drains the outbox of pending review events to POST /api/study/sync, then
 * overwrites local progress with the server-authoritative state and acks the
 * processed events. Retries (with WorkManager backoff) when the network fails.
 */
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val outbox: OutboxRepository,
    private val api: FlashkarteApi,
    private val local: LocalStudyStore,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val pending = outbox.pending()
        if (pending.isEmpty()) return Result.success()
        return try {
            val res = api.syncReviews(
                SyncRequest(
                    pending.map { SyncEventDto(it.eventId, it.cardId, it.rating, it.reviewedAt) },
                ),
            )
            res.progress.forEach { p ->
                local.cacheProgress(
                    CardProgress(
                        id = p.card_id,
                        cardId = p.card_id,
                        easiness = p.easiness,
                        interval = p.interval,
                        repetitions = p.repetitions,
                        dueDate = p.due_at,
                        lastReviewed = null,
                        lastRating = p.lastRating,
                    ),
                )
            }
            outbox.ack(res.acked_event_ids)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
