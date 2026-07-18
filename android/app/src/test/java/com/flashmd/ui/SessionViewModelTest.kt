package com.flashmd.ui

import com.flashmd.data.repository.AuthRepository
import com.flashmd.ui.auth.SessionViewModel
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
class SessionViewModelTest {
    private val authRepository = mockk<AuthRepository>()

    @Before
    fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { authRepository.isLoggedIn } returns flowOf(true)
    }

    @After
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun `logout failure is exposed to the UI`() = runTest {
        coEvery { authRepository.logout() } throws IllegalStateException("disk full")
        val viewModel = SessionViewModel(authRepository)

        viewModel.logout()
        advanceUntilIdle()

        assertEquals("Couldn't log out. Please try again.", viewModel.logoutError.value)
    }
}
