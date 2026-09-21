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

    @Test
    fun keepsALessonsTypeSoItIsNeverStudiedAsAFlashcard() {
        val source = newDatabase()
        val target = newDatabase()
        seedSource(source)

        PlaintextDatabaseMigrator.migrate(source, target)

        val byId = target.cardsQueries.selectAllCards().executeAsList().associateBy { it.id }
        assertEquals("read", byId.getValue("c2").type)
        assertEquals(null, byId.getValue("c1").type)
    }

    private fun newDatabase(): FlashkarteDb {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        return FlashkarteDb(driver)
    }

    private fun seedSource(db: FlashkarteDb) {
        db.decksQueries.upsertDeck(
            "d1", "Deck", "deck.md", "created", null, 1,
            true, "de-DE", "en-GB", "front", 0.8, 42,
        )
        db.cardsQueries.upsertCard("c1", "d1", "front", "back", null, 0, "label", "[]", null)
        // A lesson (reading card): its type must survive the copy, or it would turn
        // into an ordinary card the moment the cache moves to the encrypted database.
        db.cardsQueries.upsertCard("c2", "d1", "Lesson", "Body", null, 1, null, null, "read")
        db.cardProgressQueries.upsertProgress("c1", 2.6, 3, 2, "due", "reviewed", 4)
        db.outboxQueries.enqueue("e1", "c1", 4, "reviewed", "created", 1)
    }
}
