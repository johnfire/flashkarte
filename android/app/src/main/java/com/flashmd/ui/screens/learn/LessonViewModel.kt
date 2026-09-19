package com.flashmd.ui.screens.learn

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.dto.LessonAnswerResponseDto
import com.flashmd.data.remote.dto.LessonScreensDto
import com.flashmd.data.remote.dto.LessonStepResponseDto
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.StepDto
import com.flashmd.data.remote.dto.UnlockedLessonDto
import com.flashmd.data.repository.LearnRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** What the learner just answered, kept on screen until they choose to go on. */
data class AnswerFeedback(val question: QuestionStepDto, val response: LessonAnswerResponseDto)

sealed interface CommentState {
    data object Idle : CommentState
    data object Saving : CommentState
    data class Saved(val number: String) : CommentState
    data class Failed(val message: String) : CommentState
}

sealed interface OpenBookState {
    data object Closed : OpenBookState
    data object Loading : OpenBookState
    data class Open(val screens: LessonScreensDto) : OpenBookState
    data object Failed : OpenBookState
}

data class LessonUiState(
    val title: String? = null,
    val step: StepDto? = null,
    val feedback: AnswerFeedback? = null,
    /** Lessons the pass just opened, for the "passed" screen. */
    val unlocked: List<UnlockedLessonDto> = emptyList(),
    val busy: Boolean = true,
    val error: String? = null,
    val comment: CommentState = CommentState.Idle,
    val openBook: OpenBookState = OpenBookState.Closed,
)

/**
 * One learner's run through a lesson. The server holds the state and the rules; this only shows
 * the current step and sends what the learner did. After an answer the reply already contains the
 * next step, but it is held back until the learner has read the reasons and chosen to continue.
 */
@HiltViewModel
class LessonViewModel @Inject constructor(
    private val repo: LearnRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    private val subjectId: String = checkNotNull(savedState["subjectId"])
    private val slug: String = checkNotNull(savedState["slug"])
    private val _state = MutableStateFlow(LessonUiState())
    val state: StateFlow<LessonUiState> = _state.asStateFlow()

    init { perform { repo.start(subjectId, slug) } }

    private fun perform(call: suspend () -> LessonStepResponseDto) {
        if (!beginWork()) return
        viewModelScope.launch {
            try {
                val reply = call()
                _state.update {
                    it.copy(title = reply.lesson.title, step = reply.step, feedback = null, busy = false)
                }
            } catch (e: Exception) {
                _state.update { it.copy(busy = false, error = messageOf(e, "Something went wrong.")) }
            }
        }
    }

    /** One action at a time: a second tap while the first is in flight is ignored. */
    private fun beginWork(): Boolean {
        val current = _state.value
        if (current.busy && current.step != null) return false
        _state.value = current.copy(busy = true, error = null)
        return true
    }

    fun next() = perform { repo.next(subjectId, slug) }
    fun back() = perform { repo.back(subjectId, slug) }
    fun carryOn() = perform { repo.carryOn(subjectId, slug) }
    fun pause() = perform { repo.pause(subjectId, slug) }
    fun resume() = perform { repo.start(subjectId, slug) }

    fun answer(choice: Int) {
        val question = _state.value.step as? QuestionStepDto ?: return
        if (!beginWork()) return
        viewModelScope.launch {
            try {
                val response = repo.answer(subjectId, slug, choice)
                _state.update {
                    it.copy(
                        title = response.lesson.title,
                        feedback = AnswerFeedback(question, response),
                        unlocked = if (response.passed) response.unlocked else it.unlocked,
                        busy = false,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(busy = false, error = messageOf(e, "Something went wrong.")) }
            }
        }
    }

    /** The reasons have been read: show what the answer led to (the next question, a re-read, or the result). */
    fun afterFeedback() {
        _state.update { current ->
            current.feedback?.let { current.copy(step = it.response.step, feedback = null) } ?: current
        }
    }

    fun comment(number: String, body: String) {
        val text = body.trim()
        if (text.isEmpty()) return
        _state.update { it.copy(comment = CommentState.Saving) }
        viewModelScope.launch {
            try {
                repo.comment(subjectId, number, text)
                _state.update { it.copy(comment = CommentState.Saved(number)) }
            } catch (e: Exception) {
                _state.update { it.copy(comment = CommentState.Failed(messageOf(e, "Couldn't save the comment."))) }
            }
        }
    }

    fun dismissComment() = _state.update { it.copy(comment = CommentState.Idle) }

    fun toggleOpenBook() {
        val current = _state.value.openBook
        if (current is OpenBookState.Open || current is OpenBookState.Loading) {
            _state.update { it.copy(openBook = OpenBookState.Closed) }
            return
        }
        _state.update { it.copy(openBook = OpenBookState.Loading) }
        viewModelScope.launch {
            try {
                val screens = repo.screens(subjectId, slug)
                _state.update { it.copy(openBook = OpenBookState.Open(screens)) }
            } catch (_: Exception) {
                _state.update { it.copy(openBook = OpenBookState.Failed) }
            }
        }
    }
}
