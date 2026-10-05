package com.flashmd.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class PromoCodeRequest(val code: String)

@Serializable
data class PromoPreviewDto(
    val code: String,
    val kind: String,
    val percentOff: Int? = null,
    val discountDuration: String? = null,
    val freeDays: Int? = null,
    val eligiblePlan: String,
)

@Serializable
data class SignupDiscountDto(
    val code: String,
    val percentOff: Int,
    val discountDuration: String,
    val plan: String,
)
