package com.flashmd.ui.screens.courses

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.PublicCourseSummaryDto
import com.flashmd.data.repository.CourseRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PublicCoursesUiState(
    val courses: List<PublicCourseSummaryDto> = emptyList(),
    val isLoading: Boolean = true,
    val cloningId: String? = null,
    val error: String? = null,
    val clonedCourseId: String? = null,
)

@HiltViewModel
class PublicCoursesViewModel @Inject constructor(
    private val repo: CourseRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(PublicCoursesUiState())
    val state: StateFlow<PublicCoursesUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                _state.value = _state.value.copy(courses = repo.listPublic(), isLoading = false)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Couldn't load public courses.",
                )
            }
        }
    }

    fun clone(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(cloningId = id, error = null)
            try {
                val result = repo.clone(id)
                _state.value = _state.value.copy(
                    cloningId = null,
                    clonedCourseId = result.course.id,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(cloningId = null, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    cloningId = null,
                    error = "Couldn't clone that course.",
                )
            }
        }
    }
}
