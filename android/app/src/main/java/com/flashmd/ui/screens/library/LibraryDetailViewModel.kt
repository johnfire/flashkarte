package com.flashmd.ui.screens.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LibraryDetailUiState(
    val deck: LibraryDeckDetailDto? = null,
    val isLoading: Boolean = true,
    val isCloning: Boolean = false,
    val error: String? = null,
    val clonedDeckId: String? = null,
)

@HiltViewModel
class LibraryDetailViewModel @Inject constructor(
    private val repo: LibraryRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(LibraryDetailUiState())
    val state: StateFlow<LibraryDetailUiState> = _state.asStateFlow()

    fun load(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                _state.value = _state.value.copy(deck = repo.get(id), isLoading = false)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Couldn't load this library deck.",
                )
            }
        }
    }

    fun clone(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isCloning = true, error = null)
            try {
                val newId = repo.clone(id)
                _state.value = _state.value.copy(isCloning = false, clonedDeckId = newId)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isCloning = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isCloning = false,
                    error = "Couldn't clone this deck.",
                )
            }
        }
    }
}
