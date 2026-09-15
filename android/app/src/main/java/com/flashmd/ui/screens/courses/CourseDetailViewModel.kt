package com.flashmd.ui.screens.courses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.CourseDetailDto
import com.flashmd.data.repository.CourseRepository
import com.flashmd.data.repository.DeckRepository
import com.flashmd.domain.model.Deck
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CourseDetailUiState(
    val course: CourseDetailDto? = null,
    val ownDecks: List<Deck> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val addError: String? = null,
    val deleted: Boolean = false,
)

@HiltViewModel
class CourseDetailViewModel @Inject constructor(
    private val repo: CourseRepository,
    private val deckRepo: DeckRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CourseDetailUiState())
    val state: StateFlow<CourseDetailUiState> = _state.asStateFlow()

    fun load(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                _state.value = _state.value.copy(
                    course = repo.get(id),
                    ownDecks = deckRepo.getAllDecksFlow().first(),
                    isLoading = false,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Couldn't load this course.",
                )
            }
        }
    }

    fun addDeck(courseId: String, deckId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(addError = null)
            try {
                repo.addDeck(courseId, deckId)
                _state.value = _state.value.copy(course = repo.get(courseId))
            } catch (e: ApiException) {
                _state.value = _state.value.copy(addError = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(addError = "Couldn't add that deck.")
            }
        }
    }

    fun removeDeck(courseId: String, deckId: String) {
        viewModelScope.launch {
            try {
                repo.removeDeck(courseId, deckId)
                _state.value = _state.value.copy(
                    course = _state.value.course?.let { c ->
                        c.copy(decks = c.decks.filter { it.deckId != deckId })
                    },
                )
            } catch (_: Exception) {
                _state.value = _state.value.copy(error = "Couldn't remove that deck.")
            }
        }
    }

    fun togglePublic() {
        val course = _state.value.course ?: return
        val next = !course.isPublic
        // Optimistic, reverting on failure -- same pattern as the web page.
        _state.value = _state.value.copy(course = course.copy(isPublic = next))
        viewModelScope.launch {
            try {
                repo.setPublic(course.id, next)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    course = _state.value.course?.copy(isPublic = !next),
                    error = "Couldn't update sharing.",
                )
            }
        }
    }

    fun delete() {
        val course = _state.value.course ?: return
        viewModelScope.launch {
            try {
                repo.delete(course.id)
                _state.value = _state.value.copy(deleted = true)
            } catch (_: Exception) {
                _state.value = _state.value.copy(error = "Couldn't delete the course.")
            }
        }
    }
}
