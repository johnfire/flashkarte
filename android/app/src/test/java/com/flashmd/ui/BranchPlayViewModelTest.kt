package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.DeckNode
import com.flashmd.ui.screens.play.BranchPlayViewModel
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class BranchPlayViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)

    private val graph = listOf(
        DeckNode(
            "1", "branch", "start", "Fork?", "",
            listOf(BranchOption("Left", "cave"), BranchOption("Right", "end")), 0,
        ),
        DeckNode("2", "basic", "cave", "A cave", "Dark and cold.", emptyList(), 1),
    )

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        coEvery { deckRepo.getDeckGraph("d1") } returns graph
    }
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = BranchPlayViewModel(
        deckRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")),
    )

    @Test fun startsAtEntryNode() = runTest {
        val vm = vm(); advanceUntilIdle()
        assertEquals("start", vm.uiState.value.current?.label)
    }

    @Test fun choosingOptionRoutesToTarget() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Left", "cave"))
        assertEquals("cave", vm.uiState.value.current?.label)
        assertTrue(vm.uiState.value.canGoBack)
    }

    @Test fun endTargetCompletesThePath() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Right", "end"))
        assertTrue(vm.uiState.value.isComplete)
    }

    @Test fun backReturnsToPriorNode() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Left", "cave"))
        vm.back()
        assertEquals("start", vm.uiState.value.current?.label)
    }

    @Test fun restartReturnsToEntry() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.choose(BranchOption("Right", "end"))
        vm.restart()
        assertEquals("start", vm.uiState.value.current?.label)
        assertTrue(!vm.uiState.value.isComplete)
    }
}
