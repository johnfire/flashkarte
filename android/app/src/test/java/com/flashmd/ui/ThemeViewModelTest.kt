package com.flashmd.ui

import com.flashmd.data.local.ThemeMode
import com.flashmd.data.local.ThemeStore
import com.flashmd.ui.theme.ThemeViewModel
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
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
class ThemeViewModelTest {
    private val store = mockk<ThemeStore>()

    @Before
    fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { store.mode } returns flowOf(ThemeMode.SYSTEM)
    }

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun `theme persistence failure is exposed to the UI`() = runTest {
        coEvery { store.setMode(ThemeMode.DARK) } throws IllegalStateException("disk full")
        val viewModel = ThemeViewModel(store)

        viewModel.set(ThemeMode.DARK)
        advanceUntilIdle()

        assertEquals("Couldn't save the appearance setting.", viewModel.error.value)
    }
}
