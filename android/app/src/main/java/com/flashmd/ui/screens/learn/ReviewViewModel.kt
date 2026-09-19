package com.flashmd.ui.screens.learn

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.ReviewAnswerResponseDto
import com.flashmd.data.remote.dto.StepDto
import com.flashmd.data.repository.LearnRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReviewFeedback(val question: QuestionStepDto, val response: ReviewAnswerResponseDto)

data class ReviewUiState(
    val step: StepDto? = null,
    val feedback: ReviewFeedback? = null,
    val nothingDue: Boolean = false,
    val busy: Boolean = true,
    val error: String? = null,
)

/**
 * Works through the questions that are due, one at a time: each is asked alone, a miss re-teaches
 * its screens and asks again, and the first try sets when it comes back.
 */
@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val repo: LearnRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    val subjectId: String = checkNotNull(savedState["subjectId"])
    private var questionId: String? = null
    private val _state = MutableStateFlow(ReviewUiState())
    val state: StateFlow<ReviewUiState> = _state.asStateFlow()

    init { begin() }

    /** Loads what is due and starts the first question (also used for "Next"). */
    fun begin() {
        _state.update { it.copy(busy = true, error = null, feedback = null) }
        viewModelScope.launch {
            try {
                val first = repo.dueReviews(subjectId).due.firstOrNull()
                if (first == null) {
                    questionId = null
                    _state.update { it.copy(step = null, nothingDue = true, busy = false) }
                } else {
                    val started = repo.startReview(subjectId, first.questionId)
                    questionId = first.questionId
                    _state.update { it.copy(step = started.step, nothingDue = false, busy = false) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(busy = false, error = messageOf(e, "Couldn't load your reviews.")) }
            }
        }
    }

    fun answer(choice: Int) {
        val question = _state.value.step as? QuestionStepDto ?: return
        val id = questionId ?: return
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                val response = repo.answerReview(subjectId, id, choice)
                _state.update { it.copy(feedback = ReviewFeedback(question, response), busy = false) }
            } catch (e: Exception) {
                _state.update { it.copy(busy = false, error = messageOf(e, "Something went wrong.")) }
            }
        }
    }

    fun afterFeedback() {
        _state.update { current ->
            current.feedback?.let { current.copy(step = it.response.step, feedback = null) } ?: current
        }
    }

    fun carryOn() {
        val id = questionId ?: return
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                val reply = repo.carryOnReview(subjectId, id)
                _state.update { it.copy(step = reply.step, busy = false) }
            } catch (e: Exception) {
                _state.update { it.copy(busy = false, error = messageOf(e, "Something went wrong.")) }
            }
        }
    }
}
