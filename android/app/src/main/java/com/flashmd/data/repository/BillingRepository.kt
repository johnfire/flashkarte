package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.BillingStatusDto
import com.flashmd.data.remote.dto.GooglePlayPurchaseRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BillingRepository @Inject constructor(private val api: FlashkarteApi) {
    suspend fun status(): BillingStatusDto = apiCall { api.getBillingStatus() }

    suspend fun submitGooglePlayPurchase(purchaseToken: String) {
        apiCall { api.submitGooglePlayPurchase(GooglePlayPurchaseRequest(purchaseToken)) }
    }
}
