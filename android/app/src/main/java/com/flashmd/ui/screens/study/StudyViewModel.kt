package com.flashmd.ui.screens.study

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
import com.flashmd.domain.model.DueCard
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
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
)

@HiltViewModel
class StudyViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val studyRepo: StudyRepository,
    private val errorReporter: ErrorReporter,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val deckId: String = checkNotNull(savedStateHandle["deckId"])

    private val queue = ArrayDeque<DueCard>()
    private var reviewed = 0
    private val ratingCounts = mutableMapOf<Int, Int>()

    private val _uiState = MutableStateFlow(StudyUiState())
    val uiState: StateFlow<StudyUiState> = _uiState

    init {
        viewModelScope.launch {
            try {
                val deck = deckRepo.getDeckById(deckId)
                val due = studyRepo.getDueCards(deckId)
                queue.addAll(due)

                if (queue.isEmpty()) {
                    _uiState.value = _uiState.value.copy(
                        deckTitle = deck?.title ?: "",
                        nothingDue = true,
                        isDone = true,
                        isLoading = false,
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        deckTitle = deck?.title ?: "",
                        currentCard = queue.peek(),
                        remaining = queue.size,
                        isLoading = false,
                    )
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

            queue.poll()
            ratingCounts[rating] = (ratingCounts[rating] ?: 0) + 1

            if (rating < 3) {
                queue.add(card) // re-queue at end
            } else {
                reviewed++
            }

            if (queue.isEmpty()) {
                _uiState.value = _uiState.value.copy(
                    currentCard = null,
                    isDone = true,
                    reviewed = reviewed,
                    ratingCounts = ratingCounts.toMap(),
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    currentCard = queue.peek(),
                    isFlipped = false,
                    remaining = queue.size,
                    reviewed = reviewed,
                    ratingCounts = ratingCounts.toMap(),
                )
            }
        }
    }
}
