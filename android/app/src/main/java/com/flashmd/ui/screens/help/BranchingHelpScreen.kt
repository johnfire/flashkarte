package com.flashmd.ui.screens.help

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

private val EXAMPLE = """
# Forest Path

[start]
**1. You reach a fork. Which way?**
- Go left toward the cave -> cave
- Go right toward the meadow -> meadow

[cave]
**2. A bear blocks the cave.**
- Sneak past -> treasure
- Retreat -> start

[meadow]
**3. A peaceful clearing.**
You rest here. The path ends.

[treasure]
**4. You found the treasure!**
You win.
""".trim()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BranchingHelpScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Branching decks") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text("Make a choose-your-path deck", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            Text(
                "A branching deck is played, not reviewed. The reader picks an " +
                    "option on each card and jumps to the card it points to.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(16.dp))
            Text("Rules", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Text(
                "• Give a card a name with a line like [cave] just above its question.\n" +
                    "• Under a question, add options:  - Some choice -> cave\n" +
                    "• The target is another card's name, or 'end' to finish the path.\n" +
                    "• A card with no options is a leaf: it ends the path.\n" +
                    "• The first card is where play starts. Loops are allowed.\n" +
                    "• Any deck with at least one option card becomes a branching deck.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(16.dp))
            Text("Example", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    EXAMPLE,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(12.dp),
                )
            }
        }
    }
}
