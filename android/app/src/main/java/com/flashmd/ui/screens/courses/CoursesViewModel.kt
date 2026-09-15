package com.flashmd.ui.screens.courses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.CourseSummaryDto
import com.flashmd.data.repository.CourseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CoursesUiState(
    val courses: List<CourseSummaryDto> = emptyList(),
    val isLoading: Boolean = true,
    val isCreating: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class CoursesViewModel @Inject constructor(
    private val repo: CourseRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CoursesUiState())
    val state: StateFlow<CoursesUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                _state.value = _state.value.copy(courses = repo.list(), isLoading = false)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Couldn't load courses.",
                )
            }
        }
    }

    fun create(title: String) {
        val trimmed = title.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            _state.value = _state.value.copy(isCreating = true, error = null)
            try {
                val created = repo.create(trimmed, null)
                _state.value = _state.value.copy(
                    courses = listOf(created) + _state.value.courses,
                    isCreating = false,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isCreating = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isCreating = false,
                    error = "Couldn't create the course.",
                )
            }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            try {
                repo.delete(id)
                _state.value = _state.value.copy(
                    courses = _state.value.courses.filter { it.id != id },
                )
            } catch (_: Exception) {
                _state.value = _state.value.copy(error = "Couldn't delete the course.")
            }
        }
    }
}
