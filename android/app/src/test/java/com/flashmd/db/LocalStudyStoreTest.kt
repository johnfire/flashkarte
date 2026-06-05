package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.domain.model.Card
import org.junit.Assert.assertEquals
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
}
