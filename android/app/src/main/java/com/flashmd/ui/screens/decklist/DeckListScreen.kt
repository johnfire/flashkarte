package com.flashmd.ui.screens.decklist

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeckListScreen(
    onStudyDeck: (String) -> Unit,
    onStatsDeck: (String) -> Unit,
    viewModel: DeckListViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val stream = context.contentResolver.openInputStream(uri) ?: return@rememberLauncherForActivityResult
        val fileName = uri.lastPathSegment ?: "deck.md"
        viewModel.importFromStream(stream, fileName, context)
    }

    // Error dialog
    if (state.importError != null) {
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            title = { Text("Import Failed") },
            text = { Text(state.importError!!) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearError() }) { Text("OK") }
            },
        )
    }

    // Conflict dialog
    if (state.importConflict != null) {
        AlertDialog(
            onDismissRequest = { viewModel.cancelReplace() },
            title = { Text("Deck Already Exists") },
            text = {
                Text(
                    "\"${state.importConflict}\" already exists.\n" +
                    "Replace it? Progress for unchanged cards will be kept."
                )
            },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmReplace() }) { Text("Replace") }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.cancelReplace() }) { Text("Cancel") }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("FlashMD", fontWeight = FontWeight.Bold) })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { filePicker.launch(arrayOf("text/*", "text/markdown")) }) {
                Icon(Icons.Default.Add, contentDescription = "Import deck")
            }
        },
    ) { padding ->
        if (state.decks.isEmpty()) {
            Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "No decks yet.\nTap + to import a .md file.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        } else {
            LazyColumn(
                Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(state.decks, key = { it.deck.id }) { row ->
                    DeckCard(
                        row = row,
                        onStudy = { onStudyDeck(row.deck.id) },
                        onStats = { onStatsDeck(row.deck.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun DeckCard(row: DeckRow, onStudy: () -> Unit, onStats: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(row.deck.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                val last = row.deck.lastStudied?.take(10) ?: "Never studied"
                Text(
                    "${row.totalCards} cards  •  ${row.dueCount} due today  •  $last",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(8.dp))
            TextButton(onClick = onStats) { Text("Stats") }
            Button(onClick = onStudy) { Text("Study") }
        }
    }
}
