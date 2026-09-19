package com.flashmd.ui.screens.learn

import kotlinx.serialization.json.Json

/** Real learner API responses (see LearnerContractTest), for driving view models. */
internal object LearnerFixtures {
    val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    inline fun <reified T> read(name: String): T =
        json.decodeFromString(
            checkNotNull(LearnerFixtures::class.java.classLoader?.getResourceAsStream("learner-contract/$name.json")) {
                "missing contract file $name"
            }.bufferedReader().use { it.readText() },
        )
}
