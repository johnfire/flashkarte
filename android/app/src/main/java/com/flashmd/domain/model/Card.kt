package com.flashmd.domain.model

data class Card(
    val id: String,
    val deckId: String,
    val front: String,
    val back: String,
    // Diagnostic cards (Spec 01) carry authored multiple-choice options, one of
    // which routes to `correct`; the rest route to remediation labels (or `end`).
    // Empty for ordinary cards. `label` is this card's own anchor, used to find
    // it as another card's remediation target.
    val label: String? = null,
    val options: List<BranchOption> = emptyList(),
)
