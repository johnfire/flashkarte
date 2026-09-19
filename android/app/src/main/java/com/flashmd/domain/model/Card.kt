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
    // Fixed place in the deck (0-based), independent of study order — shown
    // to the learner as "Card #N" so it survives the scheduler reordering
    // due/new cards.
    val position: Int = 0,
    // "basic" (ordinary and diagnostic), "branch", or "read": a lesson, which is
    // read and acknowledged with "Got it" and never rated or scheduled.
    val type: String = "basic",
) {
    val isLesson: Boolean get() = type == "read"
}
