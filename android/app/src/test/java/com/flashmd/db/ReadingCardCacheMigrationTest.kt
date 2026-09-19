package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.LocalStudyStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The v3 -> v4 migration (reading cards) against a *populated* v3 card cache.
 *
 * SQLDelight's verifyMigration is vacuous here (no schema snapshots are kept), so the
 * migration is exercised directly: build the old schema by hand, cache a card in it,
 * migrate, and check the card survived and is still studied as an ordinary card.
 */
class ReadingCardCacheMigrationTest {

    /** cardEntity exactly as it stood before reading cards added the type column. */
    private val V3_CARDS = """
        CREATE TABLE cardEntity (
          id TEXT NOT NULL PRIMARY KEY,
          deck_id TEXT NOT NULL,
          front TEXT NOT NULL,
          back TEXT NOT NULL,
          category TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          label TEXT,
          options TEXT
        );
    """.trimIndent()

    private val V3_PROGRESS = """
        CREATE TABLE progressEntity (
          card_id TEXT NOT NULL PRIMARY KEY,
          easiness REAL NOT NULL DEFAULT 2.5,
          interval_days INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          due_at TEXT,
          last_reviewed_at TEXT,
          last_rating INTEGER
        );
    """.trimIndent()

    @Test
    fun `an existing cached card survives the migration as an ordinary card`() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        driver.execute(null, V3_CARDS, 0)
        driver.execute(null, V3_PROGRESS, 0)
        driver.execute(
            null,
            "INSERT INTO cardEntity(id, deck_id, front, back, category, position, label, options) " +
                "VALUES ('c1', 'd1', 'Front?', 'Back.', NULL, 3, NULL, NULL);",
            0,
        )

        FlashkarteDb.Schema.migrate(driver, 3, 4)

        val db = FlashkarteDb(driver)
        val row = db.cardsQueries.selectCardsForDeck("d1").executeAsOne()
        assertEquals("Front?", row.front)
        assertNull(row.type)
        val due = LocalStudyStore(db).dueCards("d1").single()
        assertEquals("c1", due.card.id)
        assertEquals("basic", due.card.type)
        assertTrue(!due.card.isLesson)
    }
}
