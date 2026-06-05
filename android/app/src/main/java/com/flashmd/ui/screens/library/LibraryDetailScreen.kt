package com.flashmd.ui.screens.library

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryDetailScreen(
    deckId: String,
    onBack: () -> Unit,
    onCloned: (String) -> Unit,
    viewModel: LibraryDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(deckId) { viewModel.load(deckId) }
    LaunchedEffect(state.clonedDeckId) { state.clonedDeckId?.let(onCloned) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.deck?.title ?: "Deck") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
        floatingActionButton = {
            if (state.deck != null) {
                ExtendedFloatingActionButton(
                    onClick = { viewModel.clone(deckId) },
                    text = { Text(if (state.isCloning) "Cloning…" else "Clone to my decks") },
                    icon = {},
                )
            }
        },
    ) { padding ->
        when {
            state.isLoading ->
                Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) { CircularProgressIndicator() }
            state.error != null ->
                Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                }
            else -> {
                val deck = state.deck!!
                LazyColumn(
                    Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item {
                        Text(
                            "${deck.cardCount} cards  •  by ${deck.author ?: "Anonymous"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    items(deck.cards) { card ->
                        Card(
                            Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(12.dp)) {
                                Text(card.front, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    card.back,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
