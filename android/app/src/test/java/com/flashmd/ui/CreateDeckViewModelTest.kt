package com.flashmd.ui

import com.flashmd.data.repository.DeckRepository
import com.flashmd.ui.screens.createdeck.CreateDeckViewModel
import io.mockk.coEvery
import io.mockk.coVerify
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
class CreateDeckViewModelTest {
    private val repo = mockk<DeckRepository>(relaxed = true)

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun parsesCardCountOnChange() {
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("# Deck\n\nQ: a\nA: b\n\nQ: c\nA: d")
        assertEquals(2, vm.state.value.cardCount)
    }

    @Test fun emptyMarkdownShowsErrorNotSave() = runTest {
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("nonsense with no cards")
        vm.create()
        advanceUntilIdle()
        assertTrue(vm.state.value.error != null)
        coVerify(exactly = 0) { repo.importMarkdown(any(), any()) }
    }

    @Test fun validMarkdownCallsImportAndSetsDone() = runTest {
        coEvery { repo.importMarkdown(any(), any()) } returns 1
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("Q: a\nA: b")
        vm.create()
        advanceUntilIdle()
        assertTrue(vm.state.value.done)
        coVerify { repo.importMarkdown(any(), any()) }
    }

    @Test fun unexpectedImportFailureShowsErrorAndStopsSaving() = runTest {
        coEvery { repo.importMarkdown(any(), any()) } throws IllegalStateException("bad payload")
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("Q: a\nA: b")

        vm.create()
        advanceUntilIdle()

        assertEquals("Couldn't create this deck. Please try again.", vm.state.value.error)
        assertEquals(false, vm.state.value.isSaving)
    }
}
