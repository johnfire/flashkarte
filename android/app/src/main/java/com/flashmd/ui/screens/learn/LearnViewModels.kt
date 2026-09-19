package com.flashmd.ui.screens.learn

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.LearnSubjectDto
import com.flashmd.data.remote.dto.LearnerOutlineDto
import com.flashmd.data.remote.dto.LessonScreensDto
import com.flashmd.data.repository.LearnRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** The server's own message when it gave one (for example why a lesson is locked), else [fallback]. */
internal fun messageOf(error: Throwable, fallback: String): String =
    if (error is ApiException) error.message ?: fallback else fallback

data class LearnSubjectsUiState(
    val subjects: List<LearnSubjectDto> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class LearnSubjectsViewModel @Inject constructor(private val repo: LearnRepository) : ViewModel() {
    private val _state = MutableStateFlow(LearnSubjectsUiState())
    val state: StateFlow<LearnSubjectsUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val subjects = repo.subjects()
                _state.update { it.copy(subjects = subjects, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = messageOf(e, "Couldn't load your subjects.")) }
            }
        }
    }
}

data class OutlineUiState(
    val outline: LearnerOutlineDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class OutlineViewModel @Inject constructor(
    private val repo: LearnRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val subjectId: String = checkNotNull(savedState["subjectId"])
    private val _state = MutableStateFlow(OutlineUiState())
    val state: StateFlow<OutlineUiState> = _state.asStateFlow()

    init { refresh() }

    /** Also called when the learner comes back from a lesson, so states and due reviews are current. */
    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.outline == null, error = null) }
            try {
                val outline = repo.outline(subjectId)
                _state.update { OutlineUiState(outline = outline, isLoading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = messageOf(e, "Couldn't load this subject.")) }
            }
        }
    }
}

data class ReadLessonUiState(
    val lesson: LessonScreensDto? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

/** Every screen of a passed lesson, for looking back. */
@HiltViewModel
class ReadLessonViewModel @Inject constructor(
    private val repo: LearnRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val subjectId: String = checkNotNull(savedState["subjectId"])
    private val slug: String = checkNotNull(savedState["slug"])
    private val _state = MutableStateFlow(ReadLessonUiState())
    val state: StateFlow<ReadLessonUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            try {
                val lesson = repo.screens(subjectId, slug)
                _state.value = ReadLessonUiState(lesson = lesson, isLoading = false)
            } catch (e: Exception) {
                _state.value = ReadLessonUiState(isLoading = false, error = messageOf(e, "Couldn't load this lesson."))
            }
        }
    }
}
