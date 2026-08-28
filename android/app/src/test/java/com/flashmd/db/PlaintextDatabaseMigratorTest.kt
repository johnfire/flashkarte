package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.db.PlaintextDatabaseMigrator
import org.junit.Assert.assertEquals
import org.junit.Test

class PlaintextDatabaseMigratorTest {
    @Test
    fun copiesDecksCardsProgressAndPendingOutboxEvents() {
        val source = newDatabase()
        val target = newDatabase()
        seedSource(source)

        PlaintextDatabaseMigrator.migrate(source, target)

        assertEquals(
            source.decksQueries.selectAllDecks().executeAsList(),
            target.decksQueries.selectAllDecks().executeAsList(),
        )
        assertEquals(
            source.cardsQueries.selectAllCards().executeAsList(),
            target.cardsQueries.selectAllCards().executeAsList(),
        )
        assertEquals(
            source.cardProgressQueries.selectAllProgress().executeAsList(),
            target.cardProgressQueries.selectAllProgress().executeAsList(),
        )
        assertEquals(
            source.outboxQueries.selectAll().executeAsList(),
            target.outboxQueries.selectAll().executeAsList(),
        )
    }

    private fun newDatabase(): FlashkarteDb {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        return FlashkarteDb(driver)
    }

    private fun seedSource(db: FlashkarteDb) {
        db.decksQueries.upsertDeck(
            "d1", "Deck", "deck.md", "created", null, 1,
            true, "de-DE", "en-GB", "front", 0.8,
        )
        db.cardsQueries.upsertCard("c1", "d1", "front", "back", null, 0, "label", "[]")
        db.cardProgressQueries.upsertProgress("c1", 2.6, 3, 2, "due", "reviewed", 4)
        db.outboxQueries.enqueue("e1", "c1", 4, "reviewed", "created", 1)
    }
}
