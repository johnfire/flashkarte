package com.flashmd.ui.screens.decklist

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.ui.components.SyncStatusChip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeckListScreen(
    onStudyDeck: (String) -> Unit,
    onStatsDeck: (String) -> Unit,
    onCreateDeck: () -> Unit,
    viewModel: DeckListViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val pending by viewModel.pending.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("flashkarte", fontWeight = FontWeight.Bold) },
                actions = {
                    if (pending > 0) {
                        SyncStatusChip(pending, onRetry = { viewModel.onRetrySync() })
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreateDeck) {
                Icon(Icons.Default.Add, contentDescription = "New deck")
            }
        },
    ) { padding ->
        if (state.decks.isEmpty() && state.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (state.decks.isEmpty() && state.listError != null) {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            ) {
                Text(
                    state.listError!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyLarge,
                )
                Button(onClick = { viewModel.refresh() }) { Text("Retry") }
            }
        } else if (state.decks.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(
                    "No decks yet.\nTap + to create or import one.",
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
                        onRename = { t -> viewModel.rename(row.deck.id, t) },
                        onAddCards = { md -> viewModel.addCards(row.deck.id, md) },
                        onTogglePublic = { viewModel.setPublic(row.deck.id, !row.deck.isPublic) },
                        onToggleOrdered = { viewModel.setOrdered(row.deck.id, !row.deck.isOrdered) },
                        onDelete = { viewModel.delete(row.deck.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun DeckCard(
    row: DeckRow,
    onStudy: () -> Unit,
    onStats: () -> Unit,
    onRename: (String) -> Unit,
    onAddCards: (String) -> Unit,
    onTogglePublic: () -> Unit,
    onToggleOrdered: () -> Unit,
    onDelete: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var addingCards by remember { mutableStateOf(false) }
    var confirmingDelete by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(row.deck.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                val last = row.deck.lastStudied?.take(10) ?: "Never studied"
                val shared = if (row.deck.isPublic) "  •  Shared" else ""
                Text(
                    "${row.totalCards} cards  •  ${row.dueCount} due  •  $last$shared",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = onStats) { Text("Stats") }
            Button(onClick = onStudy) { Text("Study") }
            Box {
                IconButton(onClick = { menuOpen = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More")
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(text = { Text("Rename") }, onClick = { menuOpen = false; renaming = true })
                    DropdownMenuItem(text = { Text("Add cards") }, onClick = { menuOpen = false; addingCards = true })
                    DropdownMenuItem(
                        text = { Text(if (row.deck.isPublic) "Unpublish" else "Publish to library") },
                        onClick = { menuOpen = false; onTogglePublic() },
                    )
                    DropdownMenuItem(
                        text = { Text(if (row.deck.isOrdered) "Unordered study" else "Study in order") },
                        onClick = { menuOpen = false; onToggleOrdered() },
                    )
                    DropdownMenuItem(text = { Text("Delete") }, onClick = { menuOpen = false; confirmingDelete = true })
                }
            }
        }
    }

    if (renaming) {
        TextPromptDialog("Rename deck", row.deck.title, "Title") { newTitle ->
            renaming = false
            if (newTitle != null && newTitle.isNotBlank()) onRename(newTitle)
        }
    }
    if (addingCards) {
        TextPromptDialog("Add cards (Markdown)", "", "Markdown", multiline = true) { md ->
            addingCards = false
            if (md != null && md.isNotBlank()) onAddCards(md)
        }
    }
    if (confirmingDelete) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text("Delete deck?") },
            text = { Text("This permanently deletes \"${row.deck.title}\".") },
            confirmButton = { TextButton(onClick = { confirmingDelete = false; onDelete() }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { confirmingDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun TextPromptDialog(
    title: String,
    initial: String,
    label: String,
    multiline: Boolean = false,
    onResult: (String?) -> Unit,
) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = { onResult(null) },
        title = { Text(title) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text(label) },
                singleLine = !multiline,
                modifier = if (multiline) Modifier.heightIn(min = 160.dp) else Modifier,
            )
        },
        confirmButton = { TextButton(onClick = { onResult(text) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = { onResult(null) }) { Text("Cancel") } },
    )
}
