package com.flashmd.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.SyncEventDto
import com.flashmd.data.remote.dto.SyncProgressDto
import com.flashmd.data.remote.dto.SyncRequest
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.data.repository.ReviewEvent
import com.flashmd.domain.model.CardProgress
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.CancellationException
import retrofit2.HttpException
import java.io.IOException

private const val MAX_SYNC_ATTEMPTS = 5

internal enum class SyncFailureAction {
    RETRY,
    FAILURE,
}

internal fun classifySyncFailure(
    exception: Exception,
    runAttemptCount: Int,
): SyncFailureAction {
    if (runAttemptCount + 1 >= MAX_SYNC_ATTEMPTS) return SyncFailureAction.FAILURE

    return when (exception) {
        is IOException -> SyncFailureAction.RETRY
        is HttpException -> {
            val status = exception.code()
            if (status == 408 || status == 425 || status == 429 || status in 500..599) {
                SyncFailureAction.RETRY
            } else {
                SyncFailureAction.FAILURE
            }
        }
        else -> SyncFailureAction.FAILURE
    }
}

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
        return try {
            val pendingReviews = outbox.pending()
            if (pendingReviews.isEmpty()) return Result.success()
            synchronizeReviews(pendingReviews)
            Result.success()
        } catch (exception: CancellationException) {
            throw exception
        } catch (exception: Exception) {
            when (classifySyncFailure(exception, runAttemptCount)) {
                SyncFailureAction.RETRY -> Result.retry()
                SyncFailureAction.FAILURE -> Result.failure()
            }
        }
    }

    private suspend fun synchronizeReviews(pendingReviews: List<ReviewEvent>) {
        val syncEvents = pendingReviews.map { review ->
            SyncEventDto(
                review.eventId,
                review.cardId,
                review.rating,
                review.reviewedAt,
                review.optionIndex,
            )
        }
        val syncResponse = api.syncReviews(SyncRequest(syncEvents))
        syncResponse.progress.forEach { progress -> cacheProgress(progress) }
        outbox.ack(syncResponse.acked_event_ids)
    }

    private fun cacheProgress(progress: SyncProgressDto) {
        local.cacheProgress(
            CardProgress(
                id = progress.card_id,
                cardId = progress.card_id,
                easiness = progress.easiness,
                interval = progress.interval,
                repetitions = progress.repetitions,
                dueDate = progress.due_at,
                lastReviewed = null,
                lastRating = progress.lastRating,
            ),
        )
    }
}
