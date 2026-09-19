package com.flashmd.ui.screens.learn

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.LessonAnswerResponseDto
import com.flashmd.data.remote.dto.LessonScreensDto
import com.flashmd.data.remote.dto.LessonStepResponseDto
import com.flashmd.data.remote.dto.PassedStepDto
import com.flashmd.data.remote.dto.PausedStepDto
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.RemediationStepDto
import com.flashmd.data.remote.dto.ScreenCommentDto
import com.flashmd.data.remote.dto.ScreenStepDto
import com.flashmd.data.repository.LearnRepository
import com.flashmd.ui.screens.learn.LearnerFixtures.read
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LessonViewModelTest {
    private val repo = mockk<LearnRepository>()
    private val start = read<LessonStepResponseDto>("start-screen")
    private val question = read<LessonStepResponseDto>("step-question")
    private val wrong = read<LessonAnswerResponseDto>("answer-wrong")
    private val passed = read<LessonAnswerResponseDto>("answer-passed")

    @Before fun setUp() { Dispatchers.setMain(UnconfinedTestDispatcher()) }
    @After fun tearDown() { Dispatchers.resetMain() }

    private fun viewModel(): LessonViewModel =
        LessonViewModel(repo, SavedStateHandle(mapOf("subjectId" to "s1", "slug" to "tokens")))

    @Test
    fun `starting a lesson shows the step the server resumes at`() {
        coEvery { repo.start("s1", "tokens") } returns start
        val vm = viewModel()
        val state = vm.state.value
        assertEquals("Tokens", state.title)
        assertEquals("1", (state.step as ScreenStepDto).number)
        assertFalse(state.busy)
        assertNull(state.error)
    }

    @Test
    fun `a lesson that cannot be opened shows the server's reason`() {
        coEvery { repo.start("s1", "tokens") } throws
            ApiException(422, "VALIDATION", "This lesson is locked: pass \"Tokens\" first")
        val state = viewModel().state.value
        assertNull(state.step)
        assertEquals("This lesson is locked: pass \"Tokens\" first", state.error)
        assertFalse(state.busy)
    }

    @Test
    fun `next and back replace the step`() {
        coEvery { repo.start(any(), any()) } returns start
        coEvery { repo.next("s1", "tokens") } returns read<LessonStepResponseDto>("next-screen")
        coEvery { repo.back("s1", "tokens") } returns start
        val vm = viewModel()
        vm.next()
        assertEquals("2", (vm.state.value.step as ScreenStepDto).number)
        vm.back()
        assertEquals("1", (vm.state.value.step as ScreenStepDto).number)
    }

    @Test
    fun `an answer holds its reasons on screen until the learner goes on`() {
        coEvery { repo.start(any(), any()) } returns question
        coEvery { repo.answer("s1", "tokens", 1) } returns wrong
        val vm = viewModel()
        vm.answer(1)

        val held = vm.state.value
        assertNotNull(held.feedback)
        assertFalse(held.feedback!!.response.answer.correct)
        // The server has already moved on, but the learner is still reading why.
        assertTrue(held.step is QuestionStepDto)

        vm.afterFeedback()
        val after = vm.state.value
        assertNull(after.feedback)
        assertTrue(after.step is RemediationStepDto)
    }

    @Test
    fun `passing keeps what it unlocked for the result screen`() {
        coEvery { repo.start(any(), any()) } returns question
        coEvery { repo.answer("s1", "tokens", 0) } returns passed
        val vm = viewModel()
        vm.answer(0)
        vm.afterFeedback()
        assertTrue(vm.state.value.step is PassedStepDto)
        assertEquals(listOf("embeddings"), vm.state.value.unlocked.map { it.slug })
    }

    @Test
    fun `a second tap while an action is in flight is ignored`() {
        val slow = CompletableDeferred<LessonStepResponseDto>()
        coEvery { repo.start(any(), any()) } returns start
        coEvery { repo.next("s1", "tokens") } coAnswers { slow.await() }
        val vm = viewModel()
        vm.next()
        assertTrue(vm.state.value.busy)
        vm.next()
        vm.next()
        slow.complete(read("next-screen"))
        coVerify(exactly = 1) { repo.next("s1", "tokens") }
        assertFalse(vm.state.value.busy)
    }

    @Test
    fun `answering when not on a question does nothing`() {
        coEvery { repo.start(any(), any()) } returns start
        val vm = viewModel()
        vm.answer(0)
        coVerify(exactly = 0) { repo.answer(any(), any(), any()) }
    }

    @Test
    fun `come back later shows the paused step, and resume picks up again`() {
        coEvery { repo.start(any(), any()) } returns question
        coEvery { repo.pause("s1", "tokens") } returns read<LessonStepResponseDto>("paused")
        val vm = viewModel()
        vm.pause()
        assertEquals(PausedStepDto, vm.state.value.step)
        vm.resume()
        coVerify(exactly = 2) { repo.start("s1", "tokens") }
    }

    @Test
    fun `a comment is trimmed, sent against the screen number, and confirmed`() {
        coEvery { repo.start(any(), any()) } returns start
        coEvery { repo.comment("s1", "1", "What is a byte?") } returns ScreenCommentDto("c1", "1", "What is a byte?")
        val vm = viewModel()
        vm.comment("1", "  What is a byte?  ")
        assertEquals(CommentState.Saved("1"), vm.state.value.comment)
        vm.comment("1", "   ")
        coVerify(exactly = 1) { repo.comment(any(), any(), any()) }
    }

    @Test
    fun `a failed comment says so and keeps the lesson usable`() {
        coEvery { repo.start(any(), any()) } returns start
        coEvery { repo.comment(any(), any(), any()) } throws ApiException(0, "NETWORK_ERROR", "Can't reach the server.")
        val vm = viewModel()
        vm.comment("1", "hello")
        assertEquals(CommentState.Failed("Can't reach the server."), vm.state.value.comment)
        assertTrue(vm.state.value.step is ScreenStepDto)
    }

    @Test
    fun `the open book loads the screens on first open and closes on the second`() {
        coEvery { repo.start(any(), any()) } returns question
        coEvery { repo.screens("s1", "tokens") } returns read<LessonScreensDto>("open-book-screens")
        val vm = viewModel()
        vm.toggleOpenBook()
        assertEquals(4, (vm.state.value.openBook as OpenBookState.Open).screens.screens.size)
        vm.toggleOpenBook()
        assertEquals(OpenBookState.Closed, vm.state.value.openBook)
    }
}
