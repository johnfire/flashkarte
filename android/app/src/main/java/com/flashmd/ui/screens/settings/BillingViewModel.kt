package com.flashmd.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.billing.PlayBillingManager
import com.flashmd.data.billing.PlaySubscriptionOffer
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.BillingStatusDto
import com.flashmd.data.repository.BillingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class BillingUiState(
    val status: BillingStatusDto? = null,
    val offers: List<PlaySubscriptionOffer> = emptyList(),
    val isLoading: Boolean = true,
    val isLaunching: Boolean = false,
    val error: String? = null,
    val message: String? = null,
)

@HiltViewModel
class BillingViewModel @Inject constructor(
    private val repository: BillingRepository,
    private val playBilling: PlayBillingManager,
) : ViewModel() {
    private val _state = MutableStateFlow(BillingUiState())
    val state: StateFlow<BillingUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val status = repository.status()
                val offers = playBilling.offers().getOrElse { emptyList() }
                playBilling.queryExistingPurchases()
                _state.value = _state.value.copy(
                    status = status,
                    offers = offers,
                    isLoading = false,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Couldn't load subscription settings.",
                )
            }
        }
    }

    fun launchPurchase(activity: android.app.Activity, offer: PlaySubscriptionOffer) {
        if (_state.value.isLaunching) return
        _state.value = _state.value.copy(isLaunching = true, error = null, message = null)
        val launched = playBilling.launch(activity, offer)
        _state.value = _state.value.copy(
            isLaunching = false,
            message = if (launched) "Complete the purchase in Google Play." else null,
            error = if (launched) null else "Google Play could not start the purchase.",
        )
    }
}
