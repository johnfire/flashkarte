package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.Card
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class LocalStudyStoreTest {
    private lateinit var db: FlashkarteDb
    private lateinit var store: LocalStudyStore

    @Before
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        db = FlashkarteDb(driver)
        store = LocalStudyStore(db)
    }

    @Test
    fun cachesCardsAndAppliesRatingLocally() {
        store.cacheDeckCards("d1", listOf(Card("c1", "d1", "front", "back")))
        // new card is due
        assertEquals(1, store.dueCards("d1").size)

        // rating 4 on a new card -> interval 1, reps 1; due date moves out, so no longer due "now"
        store.applyRatingLocally("c1", 4, "2026-06-05T09:00:00Z")
        val p = db.cardProgressQueries.selectProgress("c1").executeAsOne()
        assertEquals(1L, p.interval_days)
        assertEquals(1L, p.repetitions)
        assertEquals(4L, p.last_rating)
        assertTrue(p.due_at!! > "2026-06-05T09:00:00Z")
    }

    // Spec 01 — diagnostic options + label survive the local cache round-trip,
    // and remediation targets resolve by label (offline).
    @Test
    fun cachesDiagnosticOptionsAndResolvesRemediationByLabel() {
        val diagnostic = Card(
            "c1", "d1", "Pick one:", "Right", "dx",
            listOf(BranchOption("Right", "correct"), BranchOption("Wrong", "fix")),
        )
        val remediation = Card("r1", "d1", "Remediation front", "Remediation back", "fix")
        store.cacheDeckCards("d1", listOf(diagnostic, remediation))

        val cached = store.dueCards("d1").first { it.card.id == "c1" }.card
        assertEquals("dx", cached.label)
        assertEquals(
            listOf(BranchOption("Right", "correct"), BranchOption("Wrong", "fix")),
            cached.options,
        )

        val resolved = store.cardByLabel("d1", "fix")
        assertNotNull(resolved)
        assertEquals("Remediation front", resolved!!.front)
        assertEquals("Remediation back", resolved.back)

        // Ordinary cards keep empty options and a null label.
        store.cacheDeckCards("d2", listOf(Card("c9", "d2", "f", "b")))
        val plain = store.dueCards("d2").first().card
        assertNull(plain.label)
        assertTrue(plain.options.isEmpty())
    }
}
