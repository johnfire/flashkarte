package com.flashmd.ui.screens.play

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.domain.model.BranchOption
import com.flashmd.domain.model.DeckNode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BranchPlayUiState(
    val current: DeckNode? = null,
    val isComplete: Boolean = false,
    val canGoBack: Boolean = false,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class BranchPlayViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val errorReporter: ErrorReporter,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val deckId: String = checkNotNull(savedStateHandle["deckId"])

    private var byLabel: Map<String, DeckNode> = emptyMap()
    private var entry: DeckNode? = null
    private val history = ArrayDeque<DeckNode>()

    private val _uiState = MutableStateFlow(BranchPlayUiState())
    val uiState: StateFlow<BranchPlayUiState> = _uiState

    init {
        viewModelScope.launch {
            try {
                val nodes = deckRepo.getDeckGraph(deckId)
                byLabel = nodes.filter { it.label != null }.associateBy { it.label!! }
                entry = nodes.minByOrNull { it.position }
                _uiState.value = BranchPlayUiState(current = entry, isLoading = false)
            } catch (e: ApiException) {
                _uiState.value = BranchPlayUiState(isLoading = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "play load failed", "BranchPlay.init", e)
                _uiState.value = BranchPlayUiState(
                    isLoading = false, error = "Couldn't load this scenario.",
                )
            }
        }
    }

    fun choose(option: BranchOption) {
        val cur = _uiState.value.current ?: return
        if (option.goto == "end") {
            history.addLast(cur)
            _uiState.value = _uiState.value.copy(isComplete = true, canGoBack = history.isNotEmpty())
            return
        }
        val target = byLabel[option.goto]
        if (target == null) {
            _uiState.value = _uiState.value.copy(error = "Dead end: \"${option.goto}\" not found.")
            return
        }
        history.addLast(cur)
        _uiState.value = _uiState.value.copy(current = target, canGoBack = true)
    }

    fun finishLeaf() {
        val cur = _uiState.value.current ?: return
        history.addLast(cur)
        _uiState.value = _uiState.value.copy(isComplete = true)
    }

    fun back() {
        if (history.isEmpty()) return
        val prev = history.removeLast()
        _uiState.value = _uiState.value.copy(
            current = prev, isComplete = false, canGoBack = history.isNotEmpty(),
        )
    }

    fun restart() {
        history.clear()
        _uiState.value = BranchPlayUiState(current = entry, isLoading = false)
    }
}
