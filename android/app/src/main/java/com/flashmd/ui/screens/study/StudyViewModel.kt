package com.flashmd.ui.screens.study

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.local.StudyMode
import com.flashmd.data.local.StudyModeStore
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.local.SpeechSettingsStore
import com.flashmd.data.repository.StudyRepository
import com.flashmd.data.speech.SpeechPlayer
import com.flashmd.domain.speech.SpeechResolver
import com.flashmd.domain.model.Card
import com.flashmd.domain.model.DueCard
import com.flashmd.domain.study.DiagnosticStudy
import com.flashmd.domain.study.StudyOption
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.ArrayDeque
import javax.inject.Inject

data class StudyUiState(
    val deckTitle: String = "",
    val currentCard: DueCard? = null,
    val isFlipped: Boolean = false,
    val remaining: Int = 0,
    val reviewed: Int = 0,
    val isDone: Boolean = false,
    val nothingDue: Boolean = false,
    val ratingCounts: Map<Int, Int> = emptyMap(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val mode: StudyMode = StudyMode.FLIP,
    val options: List<StudyOption> = emptyList(),
    // Index into [options] the learner tapped (null until they answer).
    val selectedIndex: Int? = null,
    // Spec 01: the remediation card shown as an interlude after a wrong routed
    // pick. Non-null while the interlude is on screen; it carries no rating.
    val remediation: Card? = null,
    // Spec 09. `speech` is the resolved result, so the screen only has to ask
    // "is there a language for this side?" — never how it was derived.
    val speech: SpeechResolver.Resolved = SILENT,
    val muted: Boolean = false,
)

/** Speech off: both sides null, so no button is offered and nothing plays. */
private val SILENT = SpeechResolver.Resolved(
    frontLang = null,
    backLang = null,
    autoplay = "off",
    rate = SpeechResolver.DEFAULT_RATE,
)

@HiltViewModel
class StudyViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val studyRepo: StudyRepository,
    private val errorReporter: ErrorReporter,
    savedStateHandle: SavedStateHandle,
    private val studyModeStore: StudyModeStore,
    private val speechPlayer: SpeechPlayer,
    private val speechSettings: SpeechSettingsStore,
) : ViewModel() {

    private val deckId: String = checkNotNull(savedStateHandle["deckId"])

    private val queue = ArrayDeque<DueCard>()
    private var reviewed = 0
    private val ratingCounts = mutableMapOf<Int, Int>()
    private var pool: List<String> = emptyList()
    private var ordered = false
    private val random = kotlin.random.Random.Default
    // Rating to apply once the learner dismisses a remediation interlude.
    private var pendingRating: Int? = null

    private val _uiState = MutableStateFlow(StudyUiState())
    val uiState: StateFlow<StudyUiState> = _uiState

    private fun optionsFor(card: DueCard): List<StudyOption> =
        DiagnosticStudy.selectOptions(card.card, pool, 4, random)

    init {
        viewModelScope.launch {
            try {
                val deck = deckRepo.getDeckById(deckId)
                val due = studyRepo.getDueCards(deckId)
                queue.addAll(due)
                pool = due.map { it.card.back }
                ordered = deck?.isOrdered == true
                val savedMode = studyModeStore.mode.first()
                val speech = resolveSpeechFor(deck)

                if (queue.isEmpty()) {
                    _uiState.value = _uiState.value.copy(
                        deckTitle = deck?.title ?: "",
                        nothingDue = true,
                        isDone = true,
                        isLoading = false,
                        mode = savedMode,
                        speech = speech,
                    )
                } else {
                    val first = queue.first()
                    _uiState.value = _uiState.value.copy(
                        deckTitle = deck?.title ?: "",
                        currentCard = first,
                        remaining = queue.size,
                        isLoading = false,
                        mode = savedMode,
                        speech = speech,
                        options = if (savedMode == StudyMode.CHOICE) optionsFor(first) else emptyList(),
                    )
                    autoplay("front", first)
                }
            } catch (e: ApiException) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "study load failed", "Study.init", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Couldn't load this study session.",
                )
            }
        }
    }

    fun flip() {
        if (_uiState.value.isFlipped) return
        _uiState.value = _uiState.value.copy(isFlipped = true)
        autoplay("back", _uiState.value.currentCard)
    }

    /**
     * Resolve global defaults against this deck's overrides.
     *
     * The defaults come from the local mirror rather than the network so a
     * session started offline still speaks — the commute is the case this
     * feature exists for. A deck loaded from the offline cache carries no
     * overrides, so it falls back to the global settings.
     */
    private suspend fun resolveSpeechFor(deck: com.flashmd.domain.model.Deck?):
        SpeechResolver.Resolved {
        val defaults = runCatching { speechSettings.defaults.first() }
            .getOrDefault(SpeechResolver.UserDefaults())
        return SpeechResolver.resolve(
            defaults,
            SpeechResolver.DeckOverrides(
                enabled = deck?.speechEnabled,
                frontLang = deck?.speechFrontLang,
                backLang = deck?.speechBackLang,
                autoplay = deck?.speechAutoplay,
                rate = deck?.speechRate,
            ),
            java.util.Locale.getDefault().toLanguageTag(),
        )
    }

    /** Speak one side on request — always available when the side has a voice. */
    fun speakSide(side: String) {
        val card = _uiState.value.currentCard ?: return
        val state = _uiState.value
        val lang = if (side == "front") state.speech.frontLang else state.speech.backLang
        if (lang == null) return
        val text = if (side == "front") card.card.front else card.card.back
        speechPlayer.speak(text, lang, state.speech.rate)
    }

    private fun autoplay(side: String, card: DueCard?) {
        if (card == null) return
        val state = _uiState.value
        if (state.muted) return
        if (!SpeechResolver.shouldAutoplay(state.speech, side)) return
        speakSide(side)
    }

    /**
     * Session mute — transient by design. It suppresses autoplay for this
     * sitting without touching the settings the learner actually chose.
     */
    fun toggleMute() {
        val muted = !_uiState.value.muted
        if (muted) speechPlayer.stop()
        _uiState.value = _uiState.value.copy(muted = muted)
    }

    override fun onCleared() {
        // Leaving the screen mid-utterance must not keep talking.
        speechPlayer.stop()
        super.onCleared()
    }

    fun rate(rating: Int) {
        val card = _uiState.value.currentCard ?: return
        if (!_uiState.value.isFlipped) return

        viewModelScope.launch {
            try {
                studyRepo.applyRating(card.card.id, rating)
            } catch (e: ApiException) {
                _uiState.value = _uiState.value.copy(error = e.message)
                return@launch
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "review failed", "Study.rate", e)
                _uiState.value = _uiState.value.copy(error = "Couldn't save that rating.")
                return@launch
            }
            applyAndAdvance(card, rating)
        }
    }

    fun setMode(mode: StudyMode) {
        viewModelScope.launch {
            try {
                studyModeStore.setMode(mode)
            } catch (exception: Exception) {
                errorReporter.report(
                    exception.message ?: "study mode save failed",
                    "Study.setMode",
                    exception,
                )
                _uiState.value = _uiState.value.copy(error = "Couldn't save the study mode.")
            }
        }
        val card = _uiState.value.currentCard
        _uiState.value = _uiState.value.copy(
            mode = mode,
            selectedIndex = null,
            options = if (mode == StudyMode.CHOICE && card != null) optionsFor(card) else emptyList(),
        )
    }

    fun chooseAnswer(index: Int) {
        if (_uiState.value.selectedIndex != null) return
        if (index !in _uiState.value.options.indices) return
        _uiState.value = _uiState.value.copy(selectedIndex = index)
    }

    /** Confirm the picked option: record the rating (+ option index for a
     *  diagnostic card), then either show a remediation interlude or advance. */
    fun next() {
        val card = _uiState.value.currentCard ?: return
        val index = _uiState.value.selectedIndex ?: return
        val picked = _uiState.value.options.getOrNull(index) ?: return
        val rating = if (picked.correct) 4 else 1
        viewModelScope.launch {
            try {
                studyRepo.applyRating(card.card.id, rating, picked.optionIndex)
            } catch (e: ApiException) {
                _uiState.value = _uiState.value.copy(error = e.message)
                return@launch
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "review failed", "Study.next", e)
                _uiState.value = _uiState.value.copy(error = "Couldn't save that answer.")
                return@launch
            }

            val remediationLabel = picked.remediationLabel
            val remediationCard =
                if (remediationLabel != null) {
                    studyRepo.remediationCard(deckId, remediationLabel)
                } else {
                    null
                }
            if (remediationCard != null) {
                // Show the remediation interlude; defer advancing until dismissed.
                // The interlude carries NO rating and generates NO review event.
                pendingRating = rating
                _uiState.value = _uiState.value.copy(remediation = remediationCard)
            } else {
                applyAndAdvance(card, rating)
            }
        }
    }

    /** Dismiss the remediation interlude and advance to the next card. */
    fun continueFromRemediation() {
        val card = _uiState.value.currentCard ?: return
        val rating = pendingRating ?: return
        pendingRating = null
        _uiState.value = _uiState.value.copy(remediation = null)
        applyAndAdvance(card, rating)
    }

    private fun applyAndAdvance(card: DueCard, rating: Int) {
        // Stop before advancing: the previous card's answer must not talk over
        // the next card's question.
        speechPlayer.stop()
        queue.poll()
        ratingCounts[rating] = (ratingCounts[rating] ?: 0) + 1

        if (rating < 3) {
            // Ordered decks: keep the same card up front until it's passed, so the
            // next card never unlocks early. Unordered: re-queue at the end.
            if (ordered) queue.addFirst(card) else queue.add(card)
        } else {
            reviewed++
        }

        if (queue.isEmpty()) {
            _uiState.value = _uiState.value.copy(
                currentCard = null,
                isDone = true,
                reviewed = reviewed,
                ratingCounts = ratingCounts.toMap(),
                selectedIndex = null,
                remediation = null,
            )
        } else {
            val next = queue.first()
            _uiState.value = _uiState.value.copy(
                currentCard = next,
                isFlipped = false,
                remaining = queue.size,
                reviewed = reviewed,
                ratingCounts = ratingCounts.toMap(),
                selectedIndex = null,
                remediation = null,
                options = if (_uiState.value.mode == StudyMode.CHOICE) optionsFor(next) else emptyList(),
            )
            autoplay("front", next)
        }
    }
}
