package com.flashmd.ui.screens.createdeck

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.parser.MdParser
import com.flashmd.data.remote.ApiException
import com.flashmd.data.repository.DeckRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreateDeckUiState(
    val markdown: String = "",
    val cardCount: Int = 0,
    val isSaving: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class CreateDeckViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CreateDeckUiState())
    val state: StateFlow<CreateDeckUiState> = _state.asStateFlow()

    fun onMarkdownChange(text: String) {
        val parsed = runCatching { MdParser.parse(text, "pasted.md") }.getOrNull()
        _state.value = _state.value.copy(
            markdown = text,
            cardCount = parsed?.cards?.size ?: 0,
            error = null,
        )
    }

    fun create() {
        val text = _state.value.markdown
        val parsed = runCatching { MdParser.parse(text, "pasted.md") }.getOrNull()
        if (parsed == null || parsed.cards.isEmpty()) {
            _state.value = _state.value.copy(error = "No flashcards found in this text.")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(isSaving = true, error = null)
            try {
                deckRepo.importMarkdown(text, parsed.title)
                _state.value = _state.value.copy(isSaving = false, done = true)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isSaving = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isSaving = false,
                    error = "Couldn't create this deck. Please try again.",
                )
            }
        }
    }
}
