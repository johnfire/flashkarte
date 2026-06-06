package com.flashmd.domain.model

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
