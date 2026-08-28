package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.domain.model.Deck
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The v2 -> v3 migration (Spec 09) against a *populated* v2 cache.
 *
 * SQLDelight's verifyMigration task is vacuous here — the project keeps no
 * schema snapshots for it to compare against — so the migration is exercised
 * directly: build the old schema by hand, put a deck in it, migrate, and check
 * the row survived.
 */
class DeckSpeechCacheMigrationTest {

    /** deckEntity exactly as it stood before Spec 09 added the speech columns. */
    private val V2_DECKS = """
        CREATE TABLE deckEntity (
          id TEXT NOT NULL PRIMARY KEY,
          title TEXT NOT NULL,
          source_file TEXT,
          created_at TEXT,
          last_studied TEXT,
          total_cards INTEGER NOT NULL DEFAULT 0
        );
    """.trimIndent()

    @Test
    fun `an existing cached deck survives the migration and inherits`() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        driver.execute(null, V2_DECKS, 0)
        driver.execute(
            null,
            "INSERT INTO deckEntity(id, title, source_file, created_at, last_studied, " +
                "total_cards) VALUES ('d1', 'Cached deck', 'x.md', 'c', 'u', 7);",
            0,
        )

        FlashkarteDb.Schema.migrate(driver, 2, 3)

        val cached = LocalStudyStore(FlashkarteDb(driver)).cachedDecks().single()
        assertEquals("d1", cached.id)
        assertEquals("Cached deck", cached.title)
        assertEquals(7, cached.totalCards)
        // Nothing was known about speech before the migration, so the deck
        // inherits the user's global defaults rather than being muted.
        assertNull(cached.speechEnabled)
        assertNull(cached.speechFrontLang)
        assertNull(cached.speechBackLang)
        assertNull(cached.speechAutoplay)
        assertNull(cached.speechRate)
    }

    @Test
    fun `speech overrides survive a cache round-trip so offline decks keep their voices`() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        val store = LocalStudyStore(FlashkarteDb(driver))

        store.cacheDecks(
            listOf(
                Deck(
                    "d1", "German", "", "", null,
                    speechEnabled = true,
                    speechFrontLang = "de-DE",
                    speechBackLang = "en-GB",
                    speechAutoplay = "front",
                    speechRate = 0.8,
                ),
                // Tri-state: a muted deck must not come back as "inherit".
                Deck("d2", "Muted", "", "", null, speechEnabled = false),
            ),
        )

        val byId = store.cachedDecks().associateBy { it.id }
        assertEquals(true, byId.getValue("d1").speechEnabled)
        assertEquals("de-DE", byId.getValue("d1").speechFrontLang)
        assertEquals("en-GB", byId.getValue("d1").speechBackLang)
        assertEquals("front", byId.getValue("d1").speechAutoplay)
        assertEquals(0.8, byId.getValue("d1").speechRate!!, 0.0)
        assertEquals(false, byId.getValue("d2").speechEnabled)
        assertNull(byId.getValue("d2").speechFrontLang)
    }
}
