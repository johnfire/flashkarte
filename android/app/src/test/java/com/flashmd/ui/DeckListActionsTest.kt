package com.flashmd.ui

import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.speech.SpeechPlayer
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.sync.SyncScheduler
import com.flashmd.ui.screens.decklist.DeckListViewModel
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
class DeckListActionsTest {
    private val repo = mockk<DeckRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val outbox = mockk<OutboxRepository>(relaxed = true)
    private val scheduler = mockk<SyncScheduler>(relaxed = true)
    private val speechPlayer = mockk<SpeechPlayer>(relaxed = true)

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { repo.getAllDecksFlow() } returns MutableStateFlow(emptyList())
        every { outbox.pendingCount() } returns flowOf(0L)
    }
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun actionsDelegateToRepo() = runTest {
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler, speechPlayer)
        vm.rename("d1", "New"); advanceUntilIdle()
        vm.addCards("d1", "Q: a\nA: b"); advanceUntilIdle()
        vm.setPublic("d1", true); advanceUntilIdle()
        vm.delete("d1"); advanceUntilIdle()
        coVerify { repo.renameDeck("d1", "New") }
        coVerify { repo.addCards("d1", "Q: a\nA: b") }
        coVerify { repo.setPublic("d1", true) }
        coVerify { repo.deleteDeck("d1") }
    }

    @Test fun setSpeechForwardsAllFiveOverrides() = runTest {
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler, speechPlayer)
        vm.setSpeech("d1", true, "de-DE", "en-GB", "front", 0.8); advanceUntilIdle()
        coVerify { repo.setSpeech("d1", true, "de-DE", "en-GB", "front", 0.8) }
    }

    @Test fun voiceLanguagesComeFromTheDeviceEngine() = runTest {
        every { speechPlayer.availableLanguages() } returns listOf("de-DE", "en-GB")
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler, speechPlayer)
        assertEquals(listOf("de-DE", "en-GB"), vm.voiceLanguages())
    }

    @Test fun voiceLanguagesStayEmptyWhileTheEngineIsNotReady() = runTest {
        // Empty means "unknown", not "no voices" — the picker degrades to a
        // free-text field rather than blocking the user.
        every { speechPlayer.availableLanguages() } returns emptyList()
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler, speechPlayer)
        assertEquals(emptyList<String>(), vm.voiceLanguages())
    }

    @Test fun setSpeechPassesInheritThroughAsNull() = runTest {
        // Null is a real state here, not a missing argument: it resets the field
        // to the user's global default. Muting one deck (false) must stay
        // distinguishable from inheriting (null).
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler, speechPlayer)
        vm.setSpeech("d1", false, null, null, null, null); advanceUntilIdle()
        coVerify { repo.setSpeech("d1", false, null, null, null, null) }
    }
}
