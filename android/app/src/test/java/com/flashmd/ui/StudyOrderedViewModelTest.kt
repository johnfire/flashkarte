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
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.CardProgress
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
import com.flashmd.ui.screens.study.StudyViewModel
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
class StudyOrderedViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)
    private val speechPlayer = mockk<SpeechPlayer>(relaxed = true)
    private val speechSettings = mockk<SpeechSettingsStore>(relaxed = true)

    private fun due(id: String) = DueCard(
        Card(id, "d1", "front-$id", "back-$id"),
        CardProgress(id, id, 2.5, 0, 0, "", null, null),
    )

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { modeStore.mode } returns flowOf(StudyMode.FLIP)
        every { speechSettings.defaults } returns flowOf(SpeechResolver.UserDefaults())
        coEvery { studyRepo.getDueCards("d1") } returns listOf(due("c1"), due("c2"))
    }
    @After fun tearDown() = Dispatchers.resetMain()

    private fun vm() = StudyViewModel(
        deckRepo, studyRepo, reporter, SavedStateHandle(mapOf("deckId" to "d1")), modeStore,
        speechPlayer, speechSettings,
    )

    @Test fun orderedDeckRepeatsCardUntilPassed() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "D", "", "", null, isOrdered = true)
        val vm = vm(); advanceUntilIdle()
        vm.flip(); vm.rate(1); advanceUntilIdle()
        assertEquals("c1", vm.uiState.value.currentCard?.card?.id) // still on c1
    }

    @Test fun unorderedDeckAdvancesOnWrong() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "D", "", "", null, isOrdered = false)
        val vm = vm(); advanceUntilIdle()
        vm.flip(); vm.rate(1); advanceUntilIdle()
        assertEquals("c2", vm.uiState.value.currentCard?.card?.id) // moved to c2
    }
}
