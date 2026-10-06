package com.flashmd.data.repository

import com.flashmd.data.local.CachedStudyStats
import com.flashmd.data.local.LocalStudyStore
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.LearningBlockDto
import com.flashmd.data.remote.dto.StatsDto
import com.flashmd.domain.study.LearningBlocks
import com.flashmd.sync.SyncScheduler
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.IOException

class StudyRepositoryStatsTest {
    private val api = mockk<FlashkarteApi>()
    private val local = mockk<LocalStudyStore>()
    private val outbox = mockk<OutboxRepository>()
    private val scheduler = mockk<SyncScheduler>()

    @Test
    fun `returns cached stats when the network is unavailable`() = runTest {
        coEvery { api.stats("d1") } throws IOException("offline")
        every { local.cachedStudyStats("d1", any()) } returns CachedStudyStats(
            total = 5,
            new = 1,
            due = 2,
            learned = 3,
            viewed = 4,
            hard = 1,
            medium = 1,
            good = 1,
            perfect = 1,
        )
        val repository = StudyRepository(api, local, outbox, scheduler)

        val stats = repository.getStats("d1")

        assertEquals(5, stats.total)
        assertEquals(1, stats.new)
        assertEquals(2, stats.due)
        assertEquals(3, stats.learned)
        assertEquals(4, stats.viewed)
    }

    @Test
    fun `maps the server learning block`() = runTest {
        coEvery { api.stats("d1") } returns StatsDto(
            total = 1000,
            learningBlock = LearningBlockDto(
                blockSize = 40,
                blocksTotal = 25,
                currentBlock = 3,
                currentBlockCards = 40,
                currentBlockMastered = 12,
            ),
        )
        val repository = StudyRepository(api, local, outbox, scheduler)

        val stats = repository.getStats("d1")

        assertEquals(LearningBlocks.BlockProgress(40, 25, 3, 40, 12), stats.learningBlock)
    }

    @Test
    fun `a server without learning blocks leaves the block null`() = runTest {
        coEvery { api.stats("d1") } returns StatsDto(total = 10)
        val repository = StudyRepository(api, local, outbox, scheduler)

        assertNull(repository.getStats("d1").learningBlock)
    }
}
