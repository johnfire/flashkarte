package com.flashmd.ui.screens.decklist

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.parser.MdParser
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.speech.SpeechPlayer
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.domain.model.Deck
import com.flashmd.sync.SyncScheduler
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
    val isLoading: Boolean = true,
    val listError: String? = null,
    val importError: String? = null,
)

@HiltViewModel
class DeckListViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
    private val errorReporter: ErrorReporter,
    private val outbox: OutboxRepository,
    private val scheduler: SyncScheduler,
    private val speechPlayer: SpeechPlayer,
) : ViewModel() {

    private val _isLoading = MutableStateFlow(true)
    private val _listError = MutableStateFlow<String?>(null)
    private val _importError = MutableStateFlow<String?>(null)

    /** Count of review events waiting to sync to the server. */
    val pending: StateFlow<Long> =
        outbox.pendingCount()
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0L)

    val uiState: StateFlow<DeckListUiState> = combine(
        deckRepo.getAllDecksFlow(),
        _isLoading,
        _listError,
        _importError,
    ) { decks, loading, listError, importError ->
        DeckListUiState(
            decks = decks.map { DeckRow(it, it.totalCards, it.dueCount) },
            isLoading = loading,
            listError = listError,
            importError = importError,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DeckListUiState())

    init {
        refresh()
        // Drain any reviews queued while offline when the list comes into view.
        scheduler.requestSync()
    }

    fun onRetrySync() {
        scheduler.requestSync()
    }

    fun rename(id: String, title: String) = viewModelScope.launch {
        try { deckRepo.renameDeck(id, title) }
        catch (e: Exception) { _listError.value = "Rename failed." }
    }

    fun addCards(id: String, markdown: String) = viewModelScope.launch {
        try { deckRepo.addCards(id, markdown) }
        catch (e: Exception) { _listError.value = "Couldn't add cards." }
    }

    fun setPublic(id: String, isPublic: Boolean) = viewModelScope.launch {
        try { deckRepo.setPublic(id, isPublic) }
        catch (e: Exception) { _listError.value = "Couldn't update sharing." }
    }

    fun delete(id: String) = viewModelScope.launch {
        try { deckRepo.deleteDeck(id) }
        catch (e: Exception) { _listError.value = "Delete failed." }
    }

    fun setOrdered(id: String, isOrdered: Boolean) = viewModelScope.launch {
        try { deckRepo.setOrdered(id, isOrdered) }
        catch (e: Exception) { _listError.value = "Couldn't update study order." }
    }

    /**
     * Save this deck's speech overrides.
     *
     * Every field is nullable and every one is sent: null means "inherit the
     * user's global default", which is a distinct state from any value, so the
     * dialog has to be able to say it explicitly.
     */
    fun setSpeech(
        id: String,
        enabled: Boolean?,
        frontLang: String?,
        backLang: String?,
        autoplay: String?,
        rate: Double?,
    ) = viewModelScope.launch {
        try {
            deckRepo.setSpeech(id, enabled, frontLang, backLang, autoplay, rate)
        } catch (e: Exception) {
            _listError.value = "Couldn't save this deck's speech settings."
        }
    }

    /**
     * Voices installed on this device, read when a dialog opens rather than at
     * construction: the TTS engine initialises asynchronously, so asking early
     * would usually return nothing.
     */
    fun voiceLanguages(): List<String> = speechPlayer.availableLanguages()

    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            _listError.value = null
            try {
                deckRepo.refresh()
            } catch (e: ApiException) {
                _listError.value = e.message
            } catch (e: Exception) {
                _listError.value = "Something went wrong loading your decks."
                errorReporter.report(e.message ?: "deck refresh failed", "DeckList.refresh", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun importFromStream(stream: InputStream, fileName: String, context: Context) {
        viewModelScope.launch {
            val text = try {
                stream.bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                _importError.value = "Couldn't read that file."
                return@launch
            }

            // Fast local check so we don't round-trip an obviously empty file.
            val parsed = MdParser.parse(text, fileName)
            if (parsed.cards.isEmpty()) {
                _importError.value = "No flashcards found in this file."
                return@launch
            }

            try {
                deckRepo.importMarkdown(text, parsed.title)
            } catch (e: ApiException) {
                _importError.value = e.message
            } catch (e: Exception) {
                _importError.value = "Import failed. Please try again."
                errorReporter.report(e.message ?: "import failed", "DeckList.import", e)
            }
        }
    }

    fun clearError() { _importError.value = null }
}
