package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.local.SpeechSettingsStore
import com.flashmd.data.local.StudyMode
import com.flashmd.data.local.StudyModeStore
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
import com.flashmd.data.speech.SpeechPlayer
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.speech.SpeechResolver
import com.flashmd.ui.screens.study.StudyViewModel
import io.mockk.coEvery
import io.mockk.coVerify
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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Reading cards (lessons) in the study session: read and acknowledged with "Got it",
 * never rated, not counted as reviews, and never used as a wrong answer in Choice mode.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class StudyLessonsViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)
    private val speechPlayer = mockk<SpeechPlayer>(relaxed = true)
    private val speechSettings = mockk<SpeechSettingsStore>(relaxed = true)

    private fun dueCard(card: Card) =
        DueCard(card, CardProgress(card.id, card.id, 2.5, 0, 0, "", null, null))

    private val lesson = dueCard(
        Card("l1", "d1", "How a dot product works", "LESSON BODY", position = 0, type = "read"),
    )
    private val question = dueCard(Card("q1", "d1", "What is 2+2?", "Four", position = 1))

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { modeStore.mode } returns flowOf(StudyMode.FLIP)
        every { speechSettings.defaults } returns flowOf(SpeechResolver.UserDefaults())
        coEvery { deckRepo.getDeckById("d1") } returns null
        coEvery { studyRepo.markLessonRead(any()) } returns true
    }

    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm(vararg cards: DueCard): StudyViewModel {
        coEvery { studyRepo.getDueCards("d1") } returns cards.toList()
        return StudyViewModel(
            deckRepo, studyRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")),
            modeStore, speechPlayer, speechSettings,
        )
    }

    @Test fun gotItRecordsTheReadAndMovesOnWithoutAReview() = runTest {
        val vm = vm(lesson, question)
        advanceUntilIdle()
        assertTrue(vm.uiState.value.currentCard!!.card.isLesson)

        vm.markLessonRead(); advanceUntilIdle()

        coVerify(exactly = 1) { studyRepo.markLessonRead("l1") }
        coVerify(exactly = 0) { studyRepo.applyRating(any(), any(), any()) }
        val state = vm.uiState.value
        assertEquals("q1", state.currentCard?.card?.id)
        assertEquals(1, state.lessonsRead)
        assertEquals(0, state.reviewed)
        assertEquals(1, state.remaining)
    }

    @Test fun aLessonCanNeverBeRated() = runTest {
        val vm = vm(lesson, question)
        advanceUntilIdle()

        vm.flip(); vm.rate(4); advanceUntilIdle()

        coVerify(exactly = 0) { studyRepo.applyRating(any(), any(), any()) }
        assertEquals("l1", vm.uiState.value.currentCard?.card?.id)
    }

    @Test fun aSessionOfOnlyLessonsFinishesAndSaysWhatWasRead() = runTest {
        val vm = vm(lesson)
        advanceUntilIdle()

        vm.markLessonRead(); advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state.isDone)
        assertFalse(state.nothingDue)
        assertEquals(1, state.lessonsRead)
        assertEquals(0, state.reviewed)
        assertEquals(null, state.currentCard)
    }

    @Test fun aFailedReadNeverTrapsTheLearnerOnTheLesson() = runTest {
        coEvery { studyRepo.markLessonRead("l1") } returns false
        val vm = vm(lesson, question)
        advanceUntilIdle()

        vm.markLessonRead(); advanceUntilIdle()

        assertEquals("q1", vm.uiState.value.currentCard?.card?.id)
        assertEquals(1, vm.uiState.value.lessonsRead)
    }

    @Test fun markLessonReadIsIgnoredOnAnOrdinaryCard() = runTest {
        val vm = vm(question)
        advanceUntilIdle()

        vm.markLessonRead(); advanceUntilIdle()

        coVerify(exactly = 0) { studyRepo.markLessonRead(any()) }
        assertEquals("q1", vm.uiState.value.currentCard?.card?.id)
    }

    @Test fun choiceModeNeverOffersALessonBodyAsAnAnswer() = runTest {
        every { modeStore.mode } returns flowOf(StudyMode.CHOICE)
        val vm = vm(lesson, question)
        advanceUntilIdle()
        // On the lesson itself there is nothing to choose.
        assertTrue(vm.uiState.value.options.isEmpty())

        vm.markLessonRead(); advanceUntilIdle()

        val options = vm.uiState.value.options
        assertTrue(options.isNotEmpty())
        assertTrue(options.none { it.text == "LESSON BODY" })
    }

    @Test fun switchingToChoiceOnALessonOffersNoOptions() = runTest {
        val vm = vm(lesson, question)
        advanceUntilIdle()

        vm.setMode(StudyMode.CHOICE); advanceUntilIdle()

        assertTrue(vm.uiState.value.options.isEmpty())
    }

    @Test fun lessonsAreNotSpokenAsAFlashcardWouldBe() = runTest {
        val vm = vm(lesson, question)
        advanceUntilIdle()

        io.mockk.verify(exactly = 0) { speechPlayer.speak(any(), any(), any()) }
        assertEquals("l1", vm.uiState.value.currentCard?.card?.id)
    }
}
