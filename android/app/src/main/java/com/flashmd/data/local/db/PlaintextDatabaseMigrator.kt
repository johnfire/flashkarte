package com.flashmd.data.local.db

import com.flashmd.db.FlashkarteDb

internal object PlaintextDatabaseMigrator {
    fun migrate(source: FlashkarteDb, target: FlashkarteDb) {
        val decks = source.decksQueries.selectAllDecks().executeAsList()
        val cards = source.cardsQueries.selectAllCards().executeAsList()
        val progress = source.cardProgressQueries.selectAllProgress().executeAsList()
        val outbox = source.outboxQueries.selectAll().executeAsList()

        target.transaction {
            decks.forEach { row ->
                target.decksQueries.upsertDeck(
                    row.id, row.title, row.source_file, row.created_at,
                    row.last_studied, row.total_cards,
                    row.speech_enabled, row.speech_front_lang, row.speech_back_lang,
                    row.speech_autoplay, row.speech_rate,
                )
            }
            cards.forEach { row ->
                target.cardsQueries.upsertCard(
                    row.id, row.deck_id, row.front, row.back, row.category,
                    row.position, row.label, row.options,
                )
            }
            progress.forEach { row ->
                target.cardProgressQueries.upsertProgress(
                    row.card_id, row.easiness, row.interval_days, row.repetitions,
                    row.due_at, row.last_reviewed_at, row.last_rating,
                )
            }
            outbox.forEach { row ->
                target.outboxQueries.enqueue(
                    row.event_id, row.card_id, row.rating, row.reviewed_at,
                    row.created_at, row.option_index,
                )
            }
        }

        check(target.decksQueries.selectAllDecks().executeAsList() == decks)
        check(target.cardsQueries.selectAllCards().executeAsList() == cards)
        check(target.cardProgressQueries.selectAllProgress().executeAsList() == progress)
        check(target.outboxQueries.selectAll().executeAsList() == outbox)
    }
}
