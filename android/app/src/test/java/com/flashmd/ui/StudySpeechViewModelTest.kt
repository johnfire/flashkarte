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
import com.flashmd.domain.model.Deck
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.speech.SpeechResolver
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** Records what was spoken so the tests can assert side, language and rate. */
private class FakeSpeechPlayer : SpeechPlayer {
    data class Utterance(val text: String, val lang: String, val rate: Double)

    val spoken = mutableListOf<Utterance>()
    var stops = 0

    override fun speak(text: String, lang: String, rate: Double) {
        spoken += Utterance(text, lang, rate)
    }

    override fun stop() {
        stops++
    }

    override fun canSpeak(lang: String) = true
    override fun availableLanguages() = listOf("de-DE", "en-GB")
    override fun needsVoiceData(lang: String) = false
    override fun shutdown() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class StudySpeechViewModelTest {
    private val deckRepo = mockk<DeckRepository>(relaxed = true)
    private val studyRepo = mockk<StudyRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val modeStore = mockk<StudyModeStore>(relaxed = true)
    private val speechSettings = mockk<SpeechSettingsStore>(relaxed = true)
    private val player = FakeSpeechPlayer()

    private fun due(id: String) = DueCard(
        Card(id, "d1", "front-$id", "back-$id"),
        CardProgress(id, id, 2.5, 0, 0, "", null, null),
    )

    private val languageDeck = Deck(
        "d1", "German", "", "", null,
        speechEnabled = true,
        speechFrontLang = "de-DE",
        speechBackLang = "en-GB",
        speechRate = 0.8,
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
        player, speechSettings,
    )

    @Test fun `a deck override speaks even though the global switch is off`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns languageDeck
        val vm = vm(); advanceUntilIdle()

        assertEquals("de-DE", vm.uiState.value.speech.frontLang)
        assertEquals("en-GB", vm.uiState.value.speech.backLang)
    }

    @Test fun `flipping speaks the back in the back language at the deck rate`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns languageDeck
        val vm = vm(); advanceUntilIdle()

        vm.flip(); advanceUntilIdle()

        assertEquals(1, player.spoken.size)
        assertEquals(FakeSpeechPlayer.Utterance("back-c1", "en-GB", 0.8), player.spoken.first())
    }

    @Test fun `the default autoplay does not speak the front`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns languageDeck
        vm(); advanceUntilIdle()

        assertTrue(player.spoken.isEmpty())
    }

    @Test fun `autoplay front speaks the question as the card appears`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns
            languageDeck.copy(speechAutoplay = "front")
        val vm = vm(); advanceUntilIdle()

        assertEquals(1, player.spoken.size)
        assertEquals("front-c1", player.spoken.first().text)
        assertEquals("de-DE", player.spoken.first().lang)
        assertEquals(false, vm.uiState.value.isFlipped)
    }

    @Test fun `a muted deck is silent while the global switch stays on`() = runTest {
        every { speechSettings.defaults } returns
            flowOf(SpeechResolver.UserDefaults(enabled = true, lang = "en-GB"))
        coEvery { deckRepo.getDeckById("d1") } returns
            Deck("d1", "D", "", "", null, speechEnabled = false)
        val vm = vm(); advanceUntilIdle()

        vm.flip(); advanceUntilIdle()

        assertTrue(player.spoken.isEmpty())
        assertEquals(null, vm.uiState.value.speech.backLang)
    }

    @Test fun `the read-aloud user gets an unconfigured deck spoken`() = runTest {
        every { speechSettings.defaults } returns
            flowOf(SpeechResolver.UserDefaults(enabled = true, lang = "en-GB"))
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "D", "", "", null)
        val vm = vm(); advanceUntilIdle()

        vm.flip(); advanceUntilIdle()

        assertEquals("en-GB", player.spoken.single().lang)
    }

    @Test fun `muting suppresses autoplay but leaves the replay button working`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns languageDeck
        val vm = vm(); advanceUntilIdle()

        vm.toggleMute()
        vm.flip(); advanceUntilIdle()
        assertTrue(player.spoken.isEmpty())

        vm.speakSide("back")
        assertEquals("back-c1", player.spoken.single().text)
    }

    @Test fun `advancing stops the previous utterance before the next card`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns languageDeck
        val vm = vm(); advanceUntilIdle()

        vm.flip(); advanceUntilIdle()
        val stopsBefore = player.stops
        vm.rate(4); advanceUntilIdle()

        assertTrue(player.stops > stopsBefore)
        assertEquals("c2", vm.uiState.value.currentCard?.card?.id)
    }

    @Test fun `an unset side falls back to the device locale, not to silence`() = runTest {
        // Only the front is configured; the back has no deck or global value, so
        // it resolves to the device locale rather than going quiet. This is what
        // makes the read-aloud case work with no configuration at all.
        coEvery { deckRepo.getDeckById("d1") } returns
            Deck("d1", "D", "", "", null, speechEnabled = true, speechFrontLang = "ja-JP")
        val vm = vm(); advanceUntilIdle()

        val deviceTag = java.util.Locale.getDefault().toLanguageTag()
        assertEquals("ja-JP", vm.uiState.value.speech.frontLang)
        assertEquals(deviceTag, vm.uiState.value.speech.backLang)

        vm.speakSide("back")
        assertEquals(deviceTag, player.spoken.single().lang)
    }

    @Test fun `speech off means both sides are null so nothing can speak`() = runTest {
        coEvery { deckRepo.getDeckById("d1") } returns Deck("d1", "D", "", "", null)
        val vm = vm(); advanceUntilIdle()

        vm.flip(); advanceUntilIdle()
        vm.speakSide("front")
        vm.speakSide("back")

        assertEquals(null, vm.uiState.value.speech.frontLang)
        assertEquals(null, vm.uiState.value.speech.backLang)
        assertTrue(player.spoken.isEmpty())
    }
}
