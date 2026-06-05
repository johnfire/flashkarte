package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.flashmd.data.local.EventFactory
import com.flashmd.data.repository.OutboxRepository
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class OutboxRepositoryTest {
    private lateinit var repo: OutboxRepository

    private class FixedFactory : EventFactory() {
        var n = 0
        override fun newId(): String = "e${n++}"
        override fun nowIso(): String = "2026-06-05T09:0${n}:00Z"
    }

    @Before
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        repo = OutboxRepository(FlashkarteDb(driver), FixedFactory())
    }

    @Test
    fun enqueueThenAck() {
        val a = repo.enqueue("c1", 4)
        repo.enqueue("c2", 5)
        assertEquals(2, repo.pending().size)
        assertEquals(4, repo.pending().first().rating)

        repo.ack(listOf(a.eventId))
        val remaining = repo.pending()
        assertEquals(1, remaining.size)
        assertEquals("c2", remaining.first().cardId)
    }
}
