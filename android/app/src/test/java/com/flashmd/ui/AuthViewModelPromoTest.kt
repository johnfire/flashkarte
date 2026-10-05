package com.flashmd.ui

import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.remote.dto.PromoPreviewDto
import com.flashmd.data.repository.AuthRepository
import com.flashmd.ui.auth.AuthViewModel
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelPromoTest {
    private val auth = mockk<AuthRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val freePromo = PromoPreviewDto("FREE30", "free_access", freeDays = 30, eligiblePlan = "any")

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    private fun signupViewModel() = AuthViewModel(auth, reporter).apply {
        toggleMode()
        onEmailChange("new@example.com")
        onPasswordChange("password123")
    }

    @Test fun freeAccessActivatesAtSignupWithoutAPaidPlan() = runTest {
        coEvery { auth.previewPromo(any()) } returns freePromo
        val viewModel = signupViewModel()
        viewModel.onPromoCodeChange("free30")
        viewModel.applyPromo(); advanceUntilIdle()
        assertEquals("FREE30", viewModel.uiState.value.promoCode)
        assertEquals("free", viewModel.uiState.value.signupPlan)
        viewModel.submit(); advanceUntilIdle()
        coVerify { auth.signup("new@example.com", "password123", "FREE30", "free") }
    }

    @Test fun discountIsSavedWithAnEligiblePaidPlan() = runTest {
        coEvery { auth.previewPromo(any()) } returns PromoPreviewDto("YEAR20", "discount", 20, "once", eligiblePlan = "yearly")
        val viewModel = signupViewModel()
        viewModel.onPromoCodeChange("YEAR20")
        viewModel.applyPromo(); advanceUntilIdle()
        assertEquals("yearly", viewModel.uiState.value.signupPlan)
        viewModel.submit(); advanceUntilIdle()
        coVerify { auth.signup("new@example.com", "password123", "YEAR20", "yearly") }
    }

    @Test fun unappliedCodeCannotBeSilentlyIgnored() = runTest {
        val viewModel = signupViewModel()
        viewModel.onPromoCodeChange("FREE30")
        viewModel.submit(); advanceUntilIdle()
        assertTrue(viewModel.uiState.value.error!!.contains("Apply or remove"))
        coVerify(exactly = 0) { auth.signup(any(), any(), any(), any()) }
    }

    @Test fun invalidPromoDoesNotStartSignup() = runTest {
        coEvery { auth.previewPromo(any()) } throws ApiException(422, "VALIDATION_ERROR", "Promo expired")
        val viewModel = signupViewModel()
        viewModel.onPromoCodeChange("EXPIRED")
        viewModel.applyPromo(); advanceUntilIdle()
        assertEquals("Promo expired", viewModel.uiState.value.error)
        assertFalse(viewModel.uiState.value.isApplyingPromo)
        assertNull(viewModel.uiState.value.promo)
    }

    @Test fun codeEditsInvalidateAnEarlierPreviewResponse() = runTest {
        val preview = CompletableDeferred<PromoPreviewDto>()
        coEvery { auth.previewPromo(any()) } coAnswers { preview.await() }
        val viewModel = signupViewModel()
        viewModel.onPromoCodeChange("FREE30")
        viewModel.applyPromo(); runCurrent()
        viewModel.onPromoCodeChange("OTHER")
        preview.complete(freePromo); advanceUntilIdle()
        assertEquals("OTHER", viewModel.uiState.value.promoCode)
        assertNull(viewModel.uiState.value.promo)
    }

    @Test fun removingTheCodeLeavesNormalSignupAvailable() = runTest {
        val viewModel = signupViewModel()
        viewModel.onPromoCodeChange("FREE30")
        viewModel.onPromoCodeChange("")
        viewModel.submit(); advanceUntilIdle()
        coVerify { auth.signup("new@example.com", "password123") }
    }
}
