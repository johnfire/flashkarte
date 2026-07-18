package com.flashmd.ui

import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.repository.LibraryRepository
import com.flashmd.ui.screens.library.LibraryDetailViewModel
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
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LibraryDetailViewModelTest {
    private val repo = mockk<LibraryRepository>()

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadThenCloneSetsClonedId() = runTest {
        coEvery { repo.get("d1") } returns LibraryDeckDetailDto("d1", "Bio", "Ada", 1, null, emptyList())
        coEvery { repo.clone("d1") } returns "new1"
        val vm = LibraryDetailViewModel(repo)
        vm.load("d1"); advanceUntilIdle()
        assertEquals("Bio", vm.state.value.deck?.title)
        vm.clone("d1"); advanceUntilIdle()
        assertEquals("new1", vm.state.value.clonedDeckId)
    }

    @Test fun unexpectedCloneFailureShowsErrorAndStopsCloning() = runTest {
        coEvery { repo.clone("d1") } throws IllegalStateException("bad payload")
        val vm = LibraryDetailViewModel(repo)

        vm.clone("d1")
        advanceUntilIdle()

        assertEquals("Couldn't clone this deck.", vm.state.value.error)
        assertEquals(false, vm.state.value.isCloning)
    }
}
