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
import java.time.Instant

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

        // rating 4 (Good) on a new card -> interval 2, reps 1; due date moves out,
        // so the card is no longer due "now"
        store.applyRatingLocally("c1", 4, "2026-06-05T09:00:00Z")
        val p = db.cardProgressQueries.selectProgress("c1").executeAsOne()
        assertEquals(2L, p.interval_days)
        assertEquals(1L, p.repetitions)
        assertEquals(4L, p.last_rating)
        assertTrue(p.due_at!! > "2026-06-05T09:00:00Z")
    }

    // Regression: the counters used to be one bucket per index (1/2/3/4), which
    // silently shifted every card down a level — Hard counted as Again, Easy not
    // counted at all — until a sync replaced them with the server's numbers.
    // The scale is 1-2 Again, 3 Hard, 4 Good, 5 Easy.
    @Test
    fun cachedStatsBucketEachRatingLikeTheServer() {
        store.cacheDeckCards(
            "d1",
            listOf(
                Card("again1", "d1", "f", "b"),
                Card("again2", "d1", "f", "b"),
                Card("hard", "d1", "f", "b"),
                Card("good", "d1", "f", "b"),
                Card("easy", "d1", "f", "b"),
            ),
        )

        val reviewedAt = "2026-06-05T09:00:00Z"
        store.applyRatingLocally("again1", 1, reviewedAt)
        store.applyRatingLocally("again2", 2, reviewedAt)
        store.applyRatingLocally("hard", 3, reviewedAt)
        store.applyRatingLocally("good", 4, reviewedAt)
        store.applyRatingLocally("easy", 5, reviewedAt)

        val stats = store.cachedStudyStats("d1")
        assertEquals(2, stats.again)
        assertEquals(1, stats.hard)
        assertEquals(1, stats.good)
        assertEquals(1, stats.easy)

        // The help page promises the four buckets add up to Viewed; that only
        // holds while every rating lands in exactly one of them.
        assertEquals(5, stats.viewed)
        assertEquals(stats.viewed, stats.again + stats.hard + stats.good + stats.easy)
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

    @Test
    fun derivesStatsFromCachedCardsAndProgress() {
        val cards = (1..5).map { number ->
            Card("c$number", "d1", "front-$number", "back-$number")
        }
        store.cacheDeckCards("d1", cards)
        store.applyRatingLocally("c1", 1, "2026-06-05T09:00:00Z")
        store.applyRatingLocally("c2", 2, "2026-06-05T09:00:00Z")
        store.applyRatingLocally("c3", 3, "2026-06-05T09:00:00Z")
        store.applyRatingLocally("c4", 4, "2026-06-05T09:00:00Z")

        val stats = store.cachedStudyStats("d1", Instant.parse("2026-06-05T10:00:00Z"))

        assertEquals(5, stats.total)
        assertEquals(1, stats.new)
        assertEquals(1, stats.due)
        assertEquals(2, stats.learned)
        assertEquals(4, stats.viewed)
        // Ratings 1 and 2 are both Again, and nothing here was rated 5, so no
        // card is Easy. This test previously expected one card per bucket,
        // which is what kept the off-by-one in the counters alive.
        assertEquals(2, stats.again)
        assertEquals(1, stats.hard)
        assertEquals(1, stats.good)
        assertEquals(0, stats.easy)
    }

    // Regression: cacheDeckCards used to write each card's list *index* as its
    // position, not its real server position. That happened to look right only
    // when the list was already gapless and in order — it silently drifted the
    // moment a card was deleted (leaving a gap) or the cache was filled from
    // the study-batch order instead of deck order. Position must survive the
    // round trip unchanged, out of order and with gaps.
    @Test
    fun cachesEachCardsRealPositionNotItsListIndex() {
        store.cacheDeckCards(
            "d1",
            listOf(
                Card("c1", "d1", "f1", "b1", position = 5),
                Card("c2", "d1", "f2", "b2", label = "anchor", position = 0),
            ),
        )

        val byId = store.dueCards("d1").associate { it.card.id to it.card.position }
        assertEquals(5, byId["c1"])
        assertEquals(0, byId["c2"])
        assertEquals(0, store.cardByLabel("d1", "anchor")?.position)
    }
}
