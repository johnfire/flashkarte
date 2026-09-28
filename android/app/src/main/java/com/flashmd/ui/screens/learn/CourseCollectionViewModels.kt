package com.flashmd.ui.screens.learn

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.dto.CourseCollectionDetailDto
import com.flashmd.data.remote.dto.CourseCollectionDto
import com.flashmd.data.remote.dto.CourseCollectionSource
import com.flashmd.data.remote.dto.LearnSubjectDto
import com.flashmd.data.repository.CourseCollectionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CourseCollectionCatalogUiState(
    val source: CourseCollectionSource = CourseCollectionSource.OFFICIAL,
    val collections: List<CourseCollectionDto> = emptyList(),
    val ungroupedCourses: List<LearnSubjectDto> = emptyList(),
    val enrolledSubjectIds: Set<String> = emptySet(),
    val enrollingSubjectId: String? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

/** Loads one public source at a time so a failed community catalogue cannot hide official courses. */
@HiltViewModel
class CourseCollectionCatalogViewModel @Inject constructor(
    private val repository: CourseCollectionRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CourseCollectionCatalogUiState())
    val state: StateFlow<CourseCollectionCatalogUiState> = _state.asStateFlow()

    init { refresh() }

    fun selectSource(source: CourseCollectionSource) {
        if (source == _state.value.source) return
        _state.update { it.copy(source = source) }
        refresh()
    }

    fun refresh() {
        val source = _state.value.source
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            val collections = runCatching { repository.list(source) }
            val ungroupedCourses = runCatching { repository.listUngrouped(source) }
            _state.update {
                it.copy(
                    collections = collections.getOrDefault(emptyList()),
                    ungroupedCourses = ungroupedCourses.getOrDefault(emptyList()),
                    isLoading = false,
                    error = catalogError(collections.exceptionOrNull(), ungroupedCourses.exceptionOrNull()),
                )
            }
        }
    }

    fun enroll(subjectId: String) {
        if (_state.value.enrollingSubjectId != null || subjectId in _state.value.enrolledSubjectIds) return
        viewModelScope.launch {
            _state.update { it.copy(enrollingSubjectId = subjectId, error = null) }
            try {
                repository.enroll(subjectId)
                _state.update {
                    it.copy(
                        enrolledSubjectIds = it.enrolledSubjectIds + subjectId,
                        enrollingSubjectId = null,
                    )
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        enrollingSubjectId = null,
                        error = messageOf(error, "Couldn't add this course."),
                    )
                }
            }
        }
    }
}

private fun catalogError(collectionError: Throwable?, courseError: Throwable?): String? =
    when {
        collectionError == null && courseError == null -> null
        collectionError != null && courseError != null ->
            messageOf(collectionError, "Couldn't load the course catalog.")
        else -> "Part of the course catalog could not be loaded."
    }

data class CourseCollectionDetailUiState(
    val collection: CourseCollectionDetailDto? = null,
    val enrolledSubjectIds: Set<String> = emptySet(),
    val enrollingSubjectId: String? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
)

/** Displays public courses in one collection and keeps enrolment errors local to this screen. */
@HiltViewModel
class CourseCollectionDetailViewModel @Inject constructor(
    private val repository: CourseCollectionRepository,
    savedState: SavedStateHandle,
) : ViewModel() {
    private val collectionId: String = checkNotNull(savedState["collectionId"])
    private val source = CourseCollectionSource.fromRoute(checkNotNull(savedState["source"]))
    private val _state = MutableStateFlow(CourseCollectionDetailUiState())
    val state: StateFlow<CourseCollectionDetailUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val collection = repository.get(collectionId, source)
                _state.update { it.copy(collection = collection, isLoading = false) }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = messageOf(error, "Couldn't load this course collection."),
                    )
                }
            }
        }
    }

    fun enroll(subjectId: String) {
        if (_state.value.enrollingSubjectId != null || subjectId in _state.value.enrolledSubjectIds) return
        viewModelScope.launch {
            _state.update { it.copy(enrollingSubjectId = subjectId, error = null) }
            try {
                repository.enroll(subjectId)
                _state.update {
                    it.copy(
                        enrolledSubjectIds = it.enrolledSubjectIds + subjectId,
                        enrollingSubjectId = null,
                    )
                }
            } catch (error: Exception) {
                _state.update {
                    it.copy(
                        enrollingSubjectId = null,
                        error = messageOf(error, "Couldn't add this course."),
                    )
                }
            }
        }
    }
}
