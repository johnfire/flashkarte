package com.flashmd.data.repository

import com.flashmd.data.local.CachedStudyStats
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.DeckCardDto
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.DueCard
import com.flashmd.sync.SyncScheduler
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Offline-first study repository. When online, the due batch is fetched from the
 * server and cached locally; when offline, the cached batch is used. Ratings are
 * applied locally via SM-2 and enqueued to the outbox, which the [SyncScheduler]
 * drains to the server (the authoritative SM-2 source) on connectivity.
 */
@Singleton
class StudyRepository @Inject constructor(
    private val api: FlashkarteApi,
    private val local: LocalStudyStore,
    private val outbox: OutboxRepository,
    private val scheduler: SyncScheduler,
) {
    suspend fun getDueCards(deckId: String): List<DueCard> {
        return try {
            val due = apiCall { api.studyBatch(deckId) }.map { dto ->
                DueCard(
                    card = Card(
                        id = dto.id,
                        deckId = deckId,
                        front = dto.content.front,
                        back = dto.content.back,
                        label = dto.content.label,
                        options = dto.content.options.map { BranchOption(it.text, it.goto) },
                    ),
                    progress = CardProgress(
                        id = dto.id,
                        cardId = dto.id,
                        easiness = 2.5,
                        interval = 0,
                        repetitions = 0,
                        dueDate = "",
                        lastReviewed = null,
                        lastRating = null,
                    ),
                )
            }
            // Cache the WHOLE deck (with options + labels) so diagnostic MC and
            // remediation interludes resolve offline; fall back to just the due
            // batch if the whole-deck fetch fails.
            val wholeDeck = runCatching {
                apiCall { api.getDeck(deckId) }.cards.map { it.toCard(deckId) }
            }.getOrNull()
            local.cacheDeckCards(deckId, wholeDeck ?: due.map { it.card })
            // Opportunistically drain any pending offline reviews.
            scheduler.requestSync()
            due
        } catch (e: Exception) {
            val cached = local.dueCards(deckId)
            if (cached.isNotEmpty()) cached else throw e
        }
    }

    /**
     * Offline-first: apply SM-2 locally, enqueue a sync event, and request a
     * drain. [optionIndex] records which diagnostic option was picked (Spec 01).
     */
    suspend fun applyRating(cardId: String, rating: Int, optionIndex: Int? = null) {
        val ev = outbox.enqueue(cardId, rating, optionIndex)
        local.applyRatingLocally(cardId, rating, ev.reviewedAt)
        scheduler.requestSync()
    }

    /** The remediation card a diagnostic option routes to, resolved by label
     *  from the local whole-deck cache (works offline). Null if not found. */
    fun remediationCard(deckId: String, label: String): Card? =
        local.cardByLabel(deckId, label)

    suspend fun getStats(deckId: String): DeckStudyStats {
        return try {
            val stats = apiCall { api.stats(deckId) }
            DeckStudyStats(
                total = stats.total,
                new = stats.newCount,
                due = stats.due,
                learned = stats.learned,
                viewed = stats.viewed,
                again = stats.again,
                hard = stats.hard,
                good = stats.good,
                easy = stats.easy,
            )
        } catch (exception: ApiException) {
            if (exception.status != 0) throw exception
            local.cachedStudyStats(deckId).toDeckStudyStats()
        }
    }
}

private fun CachedStudyStats.toDeckStudyStats(): DeckStudyStats = DeckStudyStats(
    total = total,
    new = new,
    due = due,
    learned = learned,
    viewed = viewed,
    again = again,
    hard = hard,
    good = good,
    easy = easy,
)

/** Whole-deck card (from GET /api/decks/:id) to a domain Card. Branch cards use
 *  their prompt as the front; diagnostic/basic cards keep front + options. */
private fun DeckCardDto.toCard(deckId: String): Card = Card(
    id = id,
    deckId = deckId,
    front = if (type == "branch") content.prompt else content.front,
    back = content.back,
    label = content.label,
    options = content.options.map { BranchOption(it.text, it.goto) },
)

data class DeckStudyStats(
    val total: Int,
    val new: Int,
    val due: Int,
    val learned: Int,
    val viewed: Int = 0,
    val again: Int = 0,
    val hard: Int = 0,
    val good: Int = 0,
    val easy: Int = 0,
)
