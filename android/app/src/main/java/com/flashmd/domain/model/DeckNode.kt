package com.flashmd.domain.model

import kotlinx.serialization.Serializable

// @Serializable so diagnostic-card options can be cached as JSON in the local
// card store (Spec 01) for offline MC + remediation.
@Serializable
data class BranchOption(val text: String, val goto: String)

data class DeckNode(
    val id: String,
    val type: String,        // "basic" | "branch"
    val label: String?,
    val prompt: String,      // branch prompt OR basic front
    val back: String,        // basic back; "" for branch
    val options: List<BranchOption>,
    val position: Int,
)
