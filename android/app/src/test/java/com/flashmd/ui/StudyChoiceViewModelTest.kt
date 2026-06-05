package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.local.StudyMode
import com.flashmd.data.local.StudyModeStore
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StudyChoiceViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)

    private fun due(id: String, back: String) = DueCard(
        Card(id, "d1", "front-$id", back),
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
    )

    @Test fun correctChoiceGradesGood() = runTest {
        val vm = vm(); advanceUntilIdle()
        assertTrue(vm.uiState.value.options.contains("A"))
        vm.chooseAnswer("A"); vm.next(); advanceUntilIdle()
        coVerify { studyRepo.applyRating("c1", 4) }
    }

    @Test fun wrongChoiceGradesAgain() = runTest {
        val vm = vm(); advanceUntilIdle()
        vm.chooseAnswer("B"); vm.next(); advanceUntilIdle()
        coVerify { studyRepo.applyRating("c1", 1) }
    }
}
