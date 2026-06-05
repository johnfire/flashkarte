package com.flashmd.db

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class OutboxQueriesTest {
    private lateinit var db: FlashkarteDb

    @Before
    fun setup() {
        val driver = JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY)
        FlashkarteDb.Schema.create(driver)
        db = FlashkarteDb(driver)
    }

    @Test
    fun enqueueCountAndDeleteByIds() {
        val q = db.outboxQueries
        q.enqueue("e1", "c1", 4, "2026-06-05T09:00:00Z", "2026-06-05T09:00:00Z")
        q.enqueue("e2", "c2", 5, "2026-06-05T09:01:00Z", "2026-06-05T09:01:00Z")
        q.enqueue("e1", "c1", 4, "2026-06-05T09:00:00Z", "2026-06-05T09:00:00Z") // dup ignored
        assertEquals(2L, q.countAll().executeAsOne())

        q.deleteByIds(listOf("e1"))
        assertEquals(1L, q.countAll().executeAsOne())
        assertEquals("e2", q.selectAll().executeAsList().single().event_id)
    }
}
