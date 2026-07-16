package com.flashmd.ui

import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.AuthRepository
import com.flashmd.ui.auth.AuthViewModel
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
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTwoFactorTest {
    private val auth = mockk<AuthRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = AuthViewModel(auth, reporter)

    @Test fun loginWithTwoFactorShowsCodeStep() = runTest {
        coEvery { auth.login(any(), any()) } returns
            AuthRepository.LoginOutcome.NeedsTwoFactor("challenge-jwt")
        val vm = vm()
        vm.onEmailChange("a@b.c")
        vm.onPasswordChange("password123")
        vm.submit(); advanceUntilIdle()

        assertEquals("challenge-jwt", vm.uiState.value.twoFactorChallenge)
        assertEquals(false, vm.uiState.value.isSubmitting)
    }

    @Test fun submittingCodeCompletesLogin() = runTest {
        coEvery { auth.login(any(), any()) } returns
            AuthRepository.LoginOutcome.NeedsTwoFactor("challenge-jwt")
        coEvery { auth.completeTwoFactorLogin(any(), any()) } returns Unit
        val vm = vm()
        vm.onEmailChange("a@b.c")
        vm.onPasswordChange("password123")
        vm.submit(); advanceUntilIdle()

        vm.onTwoFactorCodeChange("123456")
        vm.submitTwoFactor(); advanceUntilIdle()

        coVerify { auth.completeTwoFactorLogin("challenge-jwt", "123456") }
    }

    @Test fun wrongCodeShowsErrorAndStaysOnCodeStep() = runTest {
        coEvery { auth.login(any(), any()) } returns
            AuthRepository.LoginOutcome.NeedsTwoFactor("challenge-jwt")
        coEvery { auth.completeTwoFactorLogin(any(), any()) } throws
            ApiException(status = 401, code = "AUTH_ERROR", message = "Invalid two-factor code")
        val vm = vm()
        vm.onEmailChange("a@b.c")
        vm.onPasswordChange("password123")
        vm.submit(); advanceUntilIdle()

        vm.onTwoFactorCodeChange("000000")
        vm.submitTwoFactor(); advanceUntilIdle()

        assertEquals("Invalid two-factor code", vm.uiState.value.error)
        assertEquals("challenge-jwt", vm.uiState.value.twoFactorChallenge)
    }

    @Test fun cancelReturnsToPasswordStep() = runTest {
        coEvery { auth.login(any(), any()) } returns
            AuthRepository.LoginOutcome.NeedsTwoFactor("challenge-jwt")
        val vm = vm()
        vm.onEmailChange("a@b.c")
        vm.onPasswordChange("password123")
        vm.submit(); advanceUntilIdle()

        vm.cancelTwoFactor()
        assertEquals(null, vm.uiState.value.twoFactorChallenge)
    }
}
