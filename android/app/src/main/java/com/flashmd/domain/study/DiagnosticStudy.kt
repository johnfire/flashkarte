package com.flashmd.domain.study

import com.flashmd.domain.model.Card
import kotlin.random.Random

/**
 * Kotlin mirror of packages/shared/src/study/diagnostic.ts — keep in sync.
 *
 * Ordinary study (SM-2) cards receive random distractors as before; diagnostic
 * cards (Spec 01) receive their authored options, one of which is `correct` and
 * the rest of which route to remediation. resolveChoice is deterministic and must
 * agree exactly with the TS port; selectOptions shuffles, so cross-port order is
 * not compared — only invariants (see DiagnosticStudyTest.kt).
 */
object DiagnosticStudy {
    // Mirror of TS CORRECT_TARGET / END_TARGET. A diagnostic card has one option
    // targeting CORRECT; a wrong option targeting END is plain-wrong (no remedy).
    const val CORRECT_TARGET = "correct"
    private const val END_TARGET = "end"

    /** A card is diagnostic when it carries an authored `-> correct` option. */
    fun isDiagnostic(card: Card): Boolean =
        card.options.any { it.goto == CORRECT_TARGET }

    fun resolveChoice(card: Card, optionIndex: Int): ChoiceResolution {
        val option = card.options.getOrNull(optionIndex)
            ?: return ChoiceResolution(correct = false, rating = 1, remediationLabel = null)
        val correct = option.goto == CORRECT_TARGET
        val remediationLabel =
            if (correct || option.goto == END_TARGET) null else option.goto
        return ChoiceResolution(correct, if (correct) 4 else 1, remediationLabel)
    }

    fun selectOptions(
        card: Card,
        sessionPool: List<String>,
        count: Int = 4,
        random: Random = Random.Default,
    ): List<StudyOption> {
        if (isDiagnostic(card)) {
            val authored = card.options.mapIndexed { index, option ->
                val resolution = resolveChoice(card, index)
                StudyOption(
                    text = option.text,
                    optionIndex = index,
                    correct = resolution.correct,
                    remediationLabel = resolution.remediationLabel,
                )
            }
            return authored.shuffled(random)
        }

        val seen = mutableSetOf(card.back)
        val distractors = mutableListOf<String>()
        for (candidate in sessionPool) {
            if (!seen.add(candidate)) continue
            distractors += candidate
        }
        val chosen = distractors.shuffled(random).take((count - 1).coerceAtLeast(0))
        val generated = buildList {
            add(StudyOption(card.back, optionIndex = null, correct = true, remediationLabel = null))
            chosen.forEach {
                add(StudyOption(it, optionIndex = null, correct = false, remediationLabel = null))
            }
        }
        return generated.shuffled(random)
    }
}

/**
 * One multiple-choice option ready to render. [optionIndex] is the stable index
 * into the card's authored options (recorded in review_events.option_index), or
 * null for a generated distractor / the injected correct answer.
 */
data class StudyOption(
    val text: String,
    val optionIndex: Int?,
    val correct: Boolean,
    val remediationLabel: String?,
)

/** Outcome of a pick: correctness, the SM-2 rating (4 or 1), and an optional
 *  remediation card label to show as an interlude. */
data class ChoiceResolution(
    val correct: Boolean,
    val rating: Int,
    val remediationLabel: String?,
)
