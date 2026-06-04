package com.flashmd.ui.screens.decklist

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.parser.MdParser
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.StudyRepository
import com.flashmd.domain.model.Deck
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.InputStream
import javax.inject.Inject

data class DeckRow(
    val deck: Deck,
    val totalCards: Int,
    val dueCount: Int,
)

data class DeckListUiState(
    val decks: List<DeckRow> = emptyList(),
    val importError: String? = null,
    val importConflict: String? = null,   // deck title awaiting replace confirmation
    val pendingParsed: Any? = null,        // ParsedDeck held while confirm dialog shown
)

@HiltViewModel
class DeckListViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val studyRepo: StudyRepository,
) : ViewModel() {

    private val _importError = MutableStateFlow<String?>(null)
    private val _importConflict = MutableStateFlow<String?>(null)
    private val _pendingParsed = MutableStateFlow<com.flashmd.data.parser.ParsedDeck?>(null)

    val uiState: StateFlow<DeckListUiState> = combine(
        deckRepo.getAllDecksFlow(),
        _importError,
        _importConflict,
    ) { decks, error, conflict ->
        val rows = decks.map { deck ->
            val stats = studyRepo.getStats(deck.id)
            DeckRow(deck, stats.total, stats.due)
        }
        DeckListUiState(rows, error, conflict)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DeckListUiState())

    fun importFromStream(stream: InputStream, fileName: String, context: Context) {
        viewModelScope.launch {
            val text = stream.bufferedReader().readText()
            val parsed = MdParser.parse(text, fileName)

            if (parsed.cards.isEmpty()) {
                _importError.value = "No flashcards found in this file."
                return@launch
            }

            if (deckRepo.deckExistsByTitle(parsed.title)) {
                _pendingParsed.value = parsed
                _importConflict.value = parsed.title
            } else {
                deckRepo.importDeck(parsed)
            }
        }
    }

    fun confirmReplace() {
        val parsed = _pendingParsed.value ?: return
        viewModelScope.launch {
            deckRepo.importDeck(parsed)
            _pendingParsed.value = null
            _importConflict.value = null
        }
    }

    fun cancelReplace() {
        _pendingParsed.value = null
        _importConflict.value = null
    }

    fun clearError() { _importError.value = null }
}
