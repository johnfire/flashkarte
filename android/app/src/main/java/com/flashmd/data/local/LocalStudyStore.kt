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
                d.speechAutoplay, d.speechRate,
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
            )
        }

    /**
     * Replace the cached cards for a deck. Callers pass the whole deck when
     * online so diagnostic MC options and remediation targets (Spec 01) resolve
     * offline; the due batch alone is used as a fallback.
     */
    fun cacheDeckCards(deckId: String, cards: List<Card>) = db.transaction {
        db.cardsQueries.deleteCardsForDeck(deckId)
        cards.forEachIndexed { i, c ->
            db.cardsQueries.upsertCard(
                c.id, deckId, c.front, c.back, null, i.toLong(),
                c.label, encodeOptions(c.options),
            )
        }
    }

    /** Look up a card by its anchor label within a deck (diagnostic remediation
     *  targets, Spec 01). Reads from the whole-deck cache — works offline. */
    fun cardByLabel(deckId: String, label: String): Card? =
        db.cardsQueries.selectCardByLabel(deckId, label).executeAsOneOrNull()?.let {
            Card(it.id, it.deck_id, it.front, it.back, it.label, decodeOptions(it.options))
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
                card = Card(c.id, c.deck_id, c.front, c.back, c.label, decodeOptions(c.options)),
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
        val cards = db.cardsQueries.selectCardsForDeck(deckId).executeAsList()
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
            again = progressByCardId.values.count { progress -> progress.last_rating == 1L },
            hard = progressByCardId.values.count { progress -> progress.last_rating == 2L },
            good = progressByCardId.values.count { progress -> progress.last_rating == 3L },
            easy = progressByCardId.values.count { progress -> progress.last_rating == 4L },
        )
    }

    /** Apply a rating locally via SM-2 and persist the new progress. Returns the new due ISO date. */
    fun applyRatingLocally(cardId: String, rating: Int, reviewedAtIso: String): String {
        val prev = db.cardProgressQueries.selectProgress(cardId).executeAsOneOrNull()
        val current = Sm2Progress(
            easiness = prev?.easiness ?: 2.5,
            interval = (prev?.interval_days ?: 0L).toInt(),
            repetitions = (prev?.repetitions ?: 0L).toInt(),
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
