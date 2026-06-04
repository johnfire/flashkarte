package com.flashmd.ui.screens.summary

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.flashmd.ui.theme.RatingColor

private val RATING_LABELS = mapOf(1 to "Again", 2 to "Hard", 3 to "Good", 4 to "Easy", 5 to "Perfect")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionSummaryScreen(
    deckId: String,
    reviewed: Int,
    ratingCounts: Map<Int, Int>,
    onBack: () -> Unit,
    onStats: (String) -> Unit,
) {
    val nothingDue = reviewed == 0 && ratingCounts.values.all { it == 0 }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Session Complete") }) },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            if (nothingDue) {
                Text("Nothing due today!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text("All caught up. Come back later.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Text(
                    "$reviewed card${if (reviewed != 1) "s" else ""} reviewed",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(24.dp))

                // Ratings breakdown
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        for (r in 1..5) {
                            val cnt = ratingCounts[r] ?: 0
                            if (cnt == 0) continue
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    "$r  ${RATING_LABELS[r]}",
                                    color = RatingColor[r] ?: MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Medium,
                                )
                                Text("$cnt", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = { onStats(deckId) }) { Text("View Stats") }
                Button(onClick = onBack) { Text("Back to Decks") }
            }
        }
    }
}
