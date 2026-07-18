package com.flashmd.ui

import com.flashmd.data.remote.dto.LibraryDeckDto
import com.flashmd.data.repository.LibraryRepository
import com.flashmd.ui.screens.library.LibraryViewModel
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
class LibraryViewModelTest {
    private val repo = mockk<LibraryRepository>()

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadsAndSearches() = runTest {
        coEvery { repo.list(any()) } returns listOf(LibraryDeckDto("d1", "Bio", "Ada", 5, null))
        val vm = LibraryViewModel(repo)
        advanceUntilIdle()
        assertEquals(1, vm.state.value.decks.size)

        coEvery { repo.list("bio") } returns listOf(LibraryDeckDto("d1", "Bio", "Ada", 5, null))
        vm.onQueryChange("bio")
        advanceUntilIdle()
        assertEquals("bio", vm.state.value.query)
        assertEquals(1, vm.state.value.decks.size)
    }

    @Test fun unexpectedLoadFailureShowsErrorAndStopsLoading() = runTest {
        coEvery { repo.list(any()) } throws IllegalStateException("bad payload")

        val vm = LibraryViewModel(repo)
        advanceUntilIdle()

        assertEquals("Couldn't load the library.", vm.state.value.error)
        assertEquals(false, vm.state.value.isLoading)
    }
}
