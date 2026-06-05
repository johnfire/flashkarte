package com.flashmd.ui

import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.BugReportRepository
import com.flashmd.ui.screens.reportbug.ReportBugViewModel
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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ReportBugViewModelTest {
    private val repo = mockk<BugReportRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = ReportBugViewModel(repo, reporter)

    @Test fun cannotSubmitUntilTitleAndDescriptionFilled() {
        val vm = vm()
        assertFalse(vm.state.value.canSubmit)
        vm.onTitleChange("Crash")
        assertFalse(vm.state.value.canSubmit) // description still blank
        vm.onDescriptionChange("it broke")
        assertTrue(vm.state.value.canSubmit)
    }

    @Test fun successfulSubmitMarksSubmitted() = runTest {
        coEvery { repo.submit(any(), any()) } returns "https://github.com/x/y/issues/1"
        val vm = vm()
        vm.onTitleChange("Crash"); vm.onDescriptionChange("it broke")
        vm.submit(); advanceUntilIdle()
        assertTrue(vm.state.value.submitted)
        assertFalse(vm.state.value.isSubmitting)
        coVerify { repo.submit("Crash", "it broke") }
    }

    @Test fun apiErrorShowsMessageAndStopsSubmitting() = runTest {
        coEvery { repo.submit(any(), any()) } throws ApiException(500, "SERVER_ERROR", "Server down")
        val vm = vm()
        vm.onTitleChange("Crash"); vm.onDescriptionChange("it broke")
        vm.submit(); advanceUntilIdle()
        assertFalse(vm.state.value.submitted)
        assertFalse(vm.state.value.isSubmitting)
        assertEquals("Server down", vm.state.value.error)
    }
}
