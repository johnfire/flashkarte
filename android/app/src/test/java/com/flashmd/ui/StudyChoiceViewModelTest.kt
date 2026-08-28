package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.local.StudyMode
import com.flashmd.data.local.StudyModeStore
import com.flashmd.data.local.SpeechSettingsStore
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.speech.SpeechPlayer
import com.flashmd.domain.speech.SpeechResolver
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
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
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudyChoiceViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)
    private val speechPlayer = mockk<SpeechPlayer>(relaxed = true)
    private val speechSettings = mockk<SpeechSettingsStore>(relaxed = true)

    private fun due(id: String, back: String) = DueCard(
        Card(id, "d1", "front-$id", back),
        CardProgress(id, id, 2.5, 0, 0, "", null, null),
    )

    private fun diagnosticDue(id: String) = DueCard(
        Card(
            id, "d1", "Pick one:", "Right",
            label = "dx",
            options = listOf(BranchOption("Right", "correct"), BranchOption("Wrong", "fix")),
        ),
        CardProgress(id, id, 2.5, 0, 0, "", null, null),
    )

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { modeStore.mode } returns flowOf(StudyMode.CHOICE)
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "Deck", "", "", null)
        coEvery { studyRepo.getDueCards("d1") } returns listOf(due("c1", "A"), due("c2", "B"))
    }
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = StudyViewModel(
        deckRepo, studyRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")), modeStore,
        speechPlayer, speechSettings,
    )

    // Index of the presented option whose text matches, regardless of shuffle.
    private fun StudyViewModel.indexOfOption(text: String): Int =
        uiState.value.options.indexOfFirst { it.text == text }

    @Test fun correctChoiceGradesGood() = runTest {
        val vm = vm(); advanceUntilIdle()
        assertTrue(vm.uiState.value.options.any { it.text == "A" })
        vm.chooseAnswer(vm.indexOfOption("A")); vm.next(); advanceUntilIdle()
        coVerify { studyRepo.applyRating("c1", 4, null) }
    }

    @Test fun wrongChoiceGradesAgain() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.chooseAnswer(vm.indexOfOption("B")); vm.next(); advanceUntilIdle()
        coVerify { studyRepo.applyRating("c1", 1, null) }
    }

    @Test fun studyModePersistenceFailureShowsError() = runTest {
        coEvery { modeStore.setMode(StudyMode.FLIP) } throws IllegalStateException("disk full")
        val vm = vm()
        advanceUntilIdle()

        vm.setMode(StudyMode.FLIP)
        advanceUntilIdle()

        assertEquals("Couldn't save the study mode.", vm.uiState.value.error)
    }

    // Spec 01 — diagnostic answers.
    @Test fun diagnosticCorrectPickGradesGoodWithOptionIndexAndNoInterlude() = runTest {
        coEvery { studyRepo.getDueCards("d1") } returns listOf(diagnosticDue("c1"))
        val vm = vm(); advanceUntilIdle()
        // Authored options are shown (not random distractors).
        assertEquals(setOf("Right", "Wrong"), vm.uiState.value.options.map { it.text }.toSet())
        vm.chooseAnswer(vm.indexOfOption("Right")); vm.next(); advanceUntilIdle()
        coVerify(exactly = 1) { studyRepo.applyRating("c1", 4, 0) }
        assertNull(vm.uiState.value.remediation)
    }

    @Test fun diagnosticWrongRoutedPickRatesAgainRecordsIndexAndShowsInterlude() = runTest {
        coEvery { studyRepo.getDueCards("d1") } returns listOf(diagnosticDue("c1"))
        coEvery { studyRepo.remediationCard("d1", "fix") } returns
            Card("r1", "d1", "Remediation front", "Remediation back")
        val vm = vm(); advanceUntilIdle()
        vm.chooseAnswer(vm.indexOfOption("Wrong")); vm.next(); advanceUntilIdle()

        // Wrong routed pick rates Again (1) and records the authored option index.
        coVerify(exactly = 1) { studyRepo.applyRating("c1", 1, 1) }
        // The remediation interlude is shown (front + back of the routed card).
        val remediation = vm.uiState.value.remediation
        assertNotNull(remediation)
        assertEquals("Remediation front", remediation!!.front)
        assertEquals("Remediation back", remediation.back)

        // Continuing past the interlude generates NO further rating / review event.
        vm.continueFromRemediation(); advanceUntilIdle()
        assertNull(vm.uiState.value.remediation)
        coVerify(exactly = 1) { studyRepo.applyRating(any(), any(), any()) }
    }
}
