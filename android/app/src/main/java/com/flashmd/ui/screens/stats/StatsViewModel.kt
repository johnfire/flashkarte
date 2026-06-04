package com.flashmd.ui.screens.stats

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.DeckStudyStats
import com.flashmd.data.repository.StudyRepository
import com.flashmd.domain.model.Deck
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StatsUiState(
    val deck: Deck? = null,
    val stats: DeckStudyStats? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class StatsViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val studyRepo: StudyRepository,
    private val errorReporter: ErrorReporter,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val deckId: String = checkNotNull(savedStateHandle["deckId"])

    private val _uiState = MutableStateFlow(StatsUiState())
    val uiState: StateFlow<StatsUiState> = _uiState

    init {
        viewModelScope.launch {
            try {
                val deck = deckRepo.getDeckById(deckId)
                val stats = studyRepo.getStats(deckId)
                _uiState.value = StatsUiState(deck, stats, isLoading = false)
            } catch (e: ApiException) {
                _uiState.value = StatsUiState(isLoading = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "stats load failed", "Stats.init", e)
                _uiState.value =
                    StatsUiState(isLoading = false, error = "Couldn't load stats.")
            }
        }
    }
}
