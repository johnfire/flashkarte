package com.flashmd.ui.screens.study

import kotlin.random.Random

object McOptions {
    /**
     * Build multiple-choice options: the [correct] answer plus up to [count]-1
     * distinct distractors from [pool] (excluding any equal to [correct]),
     * shuffled. Returns at least [correct]. Deterministic given [random].
     */
    fun build(
        correct: String,
        pool: List<String>,
        count: Int = 4,
        random: Random = Random.Default,
    ): List<String> {
        val distractors = pool.asSequence()
            .filter { it != correct }
            .distinct()
            .toMutableList()
        distractors.shuffle(random)
        val chosen = distractors.take((count - 1).coerceAtLeast(0))
        return (chosen + correct).shuffled(random)
    }
}
