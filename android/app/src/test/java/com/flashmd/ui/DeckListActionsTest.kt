package com.flashmd.ui

import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.sync.SyncScheduler
import com.flashmd.ui.screens.decklist.DeckListViewModel
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DeckListActionsTest {
    private val repo = mockk<DeckRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val outbox = mockk<OutboxRepository>(relaxed = true)
    private val scheduler = mockk<SyncScheduler>(relaxed = true)

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { repo.getAllDecksFlow() } returns MutableStateFlow(emptyList())
        every { outbox.pendingCount() } returns flowOf(0L)
    }
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun actionsDelegateToRepo() = runTest {
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler)
        vm.rename("d1", "New"); advanceUntilIdle()
        vm.addCards("d1", "Q: a\nA: b"); advanceUntilIdle()
        vm.setPublic("d1", true); advanceUntilIdle()
        vm.delete("d1"); advanceUntilIdle()
        coVerify { repo.renameDeck("d1", "New") }
        coVerify { repo.addCards("d1", "Q: a\nA: b") }
        coVerify { repo.setPublic("d1", true) }
        coVerify { repo.deleteDeck("d1") }
    }
}
