package com.flashmd.ui.screens.learn

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.remote.dto.DueReviewsDto
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.RemediationStepDto
import com.flashmd.data.remote.dto.ReviewAnswerResponseDto
import com.flashmd.data.remote.dto.ReviewDoneStepDto
import com.flashmd.data.remote.dto.ReviewStepResponseDto
import com.flashmd.data.repository.LearnRepository
import com.flashmd.ui.screens.learn.LearnerFixtures.read
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewViewModelTest {
    private val repo = mockk<LearnRepository>()
    private val due = read<DueReviewsDto>("reviews-due")

    @Before fun setUp() { Dispatchers.setMain(UnconfinedTestDispatcher()) }
    @After fun tearDown() { Dispatchers.resetMain() }

    private fun viewModel() = ReviewViewModel(repo, SavedStateHandle(mapOf("subjectId" to "s1")))

    @Test
    fun `nothing due says so and asks nothing`() {
        coEvery { repo.dueReviews("s1") } returns DueReviewsDto()
        val state = viewModel().state.value
        assertTrue(state.nothingDue)
        assertNull(state.step)
        coVerify(exactly = 0) { repo.startReview(any(), any()) }
    }

    @Test
    fun `the first due question is asked alone`() {
        coEvery { repo.dueReviews("s1") } returns due
        coEvery { repo.startReview("s1", due.due[0].questionId) } returns read<ReviewStepResponseDto>("review-start")
        val state = viewModel().state.value
        assertTrue(state.step is QuestionStepDto)
        assertEquals(false, state.busy)
    }

    @Test
    fun `a miss shows the reasons, then the re-read, then asks again, then finishes`() {
        val id = due.due[0].questionId
        coEvery { repo.dueReviews("s1") } returns due
        coEvery { repo.startReview("s1", id) } returns read<ReviewStepResponseDto>("review-start")
        coEvery { repo.answerReview("s1", id, 0) } returns read<ReviewAnswerResponseDto>("review-answer-wrong")
        coEvery { repo.carryOnReview("s1", id) } returns read<ReviewStepResponseDto>("review-continue")
        val vm = viewModel()

        vm.answer(0)
        assertTrue(vm.state.value.feedback != null)
        vm.afterFeedback()
        assertTrue(vm.state.value.step is RemediationStepDto)
        vm.carryOn()
        assertTrue(vm.state.value.step is QuestionStepDto)

        coEvery { repo.answerReview("s1", id, 1) } returns read<ReviewAnswerResponseDto>("review-answer-done")
        vm.answer(1)
        vm.afterFeedback()
        assertTrue(vm.state.value.step is ReviewDoneStepDto)
    }
}
