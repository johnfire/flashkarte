package com.flashmd.data.local

import com.flashmd.db.FlashkarteDb
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.sm2.Sm2Algorithm
import com.flashmd.domain.sm2.Sm2Progress
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

// Diagnostic-card options are cached as a JSON array of {text, goto}.
private val optionsJson = Json { ignoreUnknownKeys = true }

private fun encodeOptions(options: List<BranchOption>): String? =
    if (options.isEmpty()) null else optionsJson.encodeToString(options)

private fun decodeOptions(raw: String?): List<BranchOption> =
    if (raw.isNullOrBlank()) {
        emptyList()
    } else {
        runCatching { optionsJson.decodeFromString<List<BranchOption>>(raw) }
            .getOrDefault(emptyList())
    }

data class CachedStudyStats(
    val total: Int,
    val new: Int,
    val due: Int,
    val learned: Int,
    val viewed: Int,
    val again: Int,
    val hard: Int,
    val good: Int,
    val easy: Int,
)

/**
 * SQLDelight-backed local mirror of decks/cards/progress. Enables offline study:
 * the due batch is cached on a successful online fetch, ratings are applied
 * locally via SM-2, and the server later overwrites progress on sync.
 */
@Singleton
class LocalStudyStore @Inject constructor(
    private val db: FlashkarteDb,
) {
    fun cacheDecks(decks: List<Deck>) = db.transaction {
        decks.forEach { d ->
            db.decksQueries.upsertDeck(
                d.id, d.title, d.sourceFile, d.createdAt, d.lastStudied, d.totalCards.toLong(),
                d.speechEnabled, d.speechFrontLang, d.speechBackLang,
                d.speechAutoplay, d.speechRate, d.referenceNumber?.toLong(),
            )
        }
    }

    fun cachedDecks(): List<Deck> =
        db.decksQueries.selectAllDecks().executeAsList().map {
            Deck(
                id = it.id,
                title = it.title,
                sourceFile = it.source_file ?: "",
                createdAt = it.created_at ?: "",
                lastStudied = it.last_studied,
                totalCards = it.total_cards.toInt(),
                speechEnabled = it.speech_enabled,
                speechFrontLang = it.speech_front_lang,
                speechBackLang = it.speech_back_lang,
                speechAutoplay = it.speech_autoplay,
                speechRate = it.speech_rate,
                referenceNumber = it.reference_number?.toInt(),
            )
        }

    /**
     * Replace the cached cards for a deck. Callers pass the whole deck when
     * online so diagnostic MC options and remediation targets (Spec 01) resolve
     * offline; the due batch alone is used as a fallback.
     */
    fun cacheDeckCards(deckId: String, cards: List<Card>) = db.transaction {
        db.cardsQueries.deleteCardsForDeck(deckId)
        cards.forEach { c ->
            db.cardsQueries.upsertCard(
                c.id, deckId, c.front, c.back, null, c.position.toLong(),
                c.label, encodeOptions(c.options), c.type,
            )
        }
    }

    /** Look up a card by its anchor label within a deck (diagnostic remediation
     *  targets, Spec 01). Reads from the whole-deck cache — works offline. */
    fun cardByLabel(deckId: String, label: String): Card? =
        db.cardsQueries.selectCardByLabel(deckId, label).executeAsOneOrNull()?.let {
            Card(
                it.id, it.deck_id, it.front, it.back, it.label,
                decodeOptions(it.options), it.position.toInt(), it.type ?: "basic",
            )
        }

    fun cacheProgress(p: CardProgress) {
        db.cardProgressQueries.upsertProgress(
            p.cardId,
            p.easiness,
            p.interval.toLong(),
            p.repetitions.toLong(),
            p.dueDate.ifEmpty { null },
            p.lastReviewed,
            p.lastRating?.toLong(),
        )
    }

    fun dueCards(deckId: String): List<DueCard> {
        val nowIso = Instant.now().toString()
        return db.cardProgressQueries.selectDueCards(deckId, nowIso).executeAsList().map { c ->
            val p = db.cardProgressQueries.selectProgress(c.id).executeAsOneOrNull()
            DueCard(
                card = Card(
                    c.id, c.deck_id, c.front, c.back, c.label,
                    decodeOptions(c.options), c.position.toInt(), c.type ?: "basic",
                ),
                progress = CardProgress(
                    id = c.id,
                    cardId = c.id,
                    easiness = p?.easiness ?: 2.5,
                    interval = (p?.interval_days ?: 0L).toInt(),
                    repetitions = (p?.repetitions ?: 0L).toInt(),
                    dueDate = p?.due_at ?: "",
                    lastReviewed = p?.last_reviewed_at,
                    lastRating = p?.last_rating?.toInt(),
                ),
            )
        }
    }

    fun cachedStudyStats(deckId: String, now: Instant = Instant.now()): CachedStudyStats {
        // Lessons are read, not reviewed: they stay out of the review numbers, as on the server.
        val cards = db.cardsQueries.selectCardsForDeck(deckId).executeAsList()
            .filter { it.type != "read" }
        val progressByCardId = cards.mapNotNull { card ->
            db.cardProgressQueries.selectProgress(card.id).executeAsOneOrNull()
        }.associateBy { progress -> progress.card_id }
        val nowIso = now.toString()

        return CachedStudyStats(
            total = cards.size,
            new = cards.count { card -> card.id !in progressByCardId },
            due = cards.count { card ->
                val progress = progressByCardId[card.id]
                progress == null || progress.due_at == null || progress.due_at <= nowIso
            },
            learned = progressByCardId.values.count { progress -> progress.repetitions > 0 },
            viewed = progressByCardId.size,
            // The rating scale is 1-2 Again, 3 Hard, 4 Good, 5 Easy - not one
            // bucket per index. These must stay in step with the server's
            // deckStats query, or the counters visibly shift the moment a sync
            // replaces these local numbers with the server's.
            again = progressByCardId.values.count { progress ->
                val rating = progress.last_rating
                rating != null && rating <= 2L
            },
            hard = progressByCardId.values.count { progress -> progress.last_rating == 3L },
            good = progressByCardId.values.count { progress -> progress.last_rating == 4L },
            easy = progressByCardId.values.count { progress -> progress.last_rating == 5L },
        )
    }

    /** Apply a rating locally via SM-2 and persist the new progress. Returns the new due ISO date. */
    fun applyRatingLocally(cardId: String, rating: Int, reviewedAtIso: String): String {
        val prev = db.cardProgressQueries.selectProgress(cardId).executeAsOneOrNull()
        val current = Sm2Progress(
            easiness = prev?.easiness ?: 2.5,
            interval = (prev?.interval_days ?: 0L).toInt(),
            repetitions = (prev?.repetitions ?: 0L).toInt(),
            // Without this the scheduler can never see an Easy streak, so an
            // Easy card would reset to the entry interval on every review.
            lastRating = prev?.last_rating?.toInt(),
        )
        val next = Sm2Algorithm.calculate(current, rating)
        val dueIso = Instant.parse(reviewedAtIso)
            .plusSeconds(next.interval.toLong() * 86_400L)
            .toString()
        db.cardProgressQueries.upsertProgress(
            cardId,
            next.easiness,
            next.interval.toLong(),
            next.repetitions.toLong(),
            dueIso,
            reviewedAtIso,
            rating.toLong(),
        )
        return dueIso
    }
}
