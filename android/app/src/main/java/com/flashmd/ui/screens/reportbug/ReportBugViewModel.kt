package com.flashmd.ui.screens.reportbug

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.BugReportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReportBugUiState(
    val title: String = "",
    val description: String = "",
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val error: String? = null,
) {
    val canSubmit: Boolean
        get() = title.isNotBlank() && description.isNotBlank() && !isSubmitting
}

@HiltViewModel
class ReportBugViewModel @Inject constructor(
    private val repo: BugReportRepository,
    private val errorReporter: ErrorReporter,
) : ViewModel() {

    private val _state = MutableStateFlow(ReportBugUiState())
    val state: StateFlow<ReportBugUiState> = _state.asStateFlow()

    fun onTitleChange(v: String) {
        _state.value = _state.value.copy(title = v.take(140), error = null)
    }

    fun onDescriptionChange(v: String) {
        _state.value = _state.value.copy(description = v.take(8000), error = null)
    }

    fun submit() {
        val s = _state.value
        if (!s.canSubmit) return
        _state.value = s.copy(isSubmitting = true, error = null)
        viewModelScope.launch {
            try {
                repo.submit(s.title, s.description)
                _state.value = _state.value.copy(isSubmitting = false, submitted = true)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isSubmitting = false, error = e.message)
            } catch (e: Exception) {
                errorReporter.report(e.message ?: "bug report failed", "ReportBug.submit", e)
                _state.value = _state.value.copy(
                    isSubmitting = false,
                    error = "Couldn't send your report. Please try again.",
                )
            }
        }
    }
}
