package com.flashmd.ui.screens.courses

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
import com.flashmd.data.remote.dto.CourseDeckDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseDetailScreen(
    courseId: String,
    onBack: () -> Unit,
    onStudyDeck: (String) -> Unit,
    viewModel: CourseDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var confirmingDelete by remember { mutableStateOf(false) }
    var removeTarget by remember { mutableStateOf<CourseDeckDto?>(null) }
    var addMenuOpen by remember { mutableStateOf(false) }

    LaunchedEffect(courseId) { viewModel.load(courseId) }
    LaunchedEffect(state.deleted) { if (state.deleted) onBack() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.course?.title ?: "Course") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                actions = {
                    if (state.course != null) {
                        TextButton(onClick = viewModel::togglePublic) {
                            Text(if (state.course!!.isPublic) "Unshare" else "Publish")
                        }
                        TextButton(onClick = { confirmingDelete = true }) { Text("Delete") }
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading ->
                Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) { CircularProgressIndicator() }
            state.error != null && state.course == null ->
                Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                }
            else -> {
                val course = state.course!!
                val availableDecks = state.ownDecks.filter { own ->
                    course.decks.none { it.deckId == own.id }
                }
                Column(Modifier.fillMaxSize().padding(padding)) {
                    LazyColumn(
                        Modifier.weight(1f),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (course.decks.isEmpty()) {
                            item {
                                Text(
                                    "This course has no decks yet.",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        items(course.decks, key = { it.deckId }) { deck ->
                            CourseDeckRow(
                                deck = deck,
                                onStudy = { onStudyDeck(deck.deckId) },
                                onRemove = { removeTarget = deck },
                            )
                        }
                    }

                    if (availableDecks.isNotEmpty()) {
                        Box(Modifier.padding(16.dp)) {
                            Button(onClick = { addMenuOpen = true }) { Text("Add an existing deck") }
                            DropdownMenu(expanded = addMenuOpen, onDismissRequest = { addMenuOpen = false }) {
                                availableDecks.forEach { deck ->
                                    DropdownMenuItem(
                                        text = { Text(deck.title) },
                                        onClick = {
                                            addMenuOpen = false
                                            viewModel.addDeck(courseId, deck.id)
                                        },
                                    )
                                }
                            }
                        }
                        state.addError?.let {
                            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(horizontal = 16.dp))
                        }
                    }
                }
            }
        }
    }

    if (confirmingDelete) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text("Delete course?") },
            text = { Text("This permanently deletes this course. Its decks are not deleted.") },
            confirmButton = {
                TextButton(onClick = { confirmingDelete = false; viewModel.delete() }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmingDelete = false }) { Text("Cancel") } },
        )
    }

    removeTarget?.let { deck ->
        AlertDialog(
            onDismissRequest = { removeTarget = null },
            title = { Text("Remove deck?") },
            text = { Text("Remove \"${deck.title}\" from this course? The deck itself won't be deleted.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.removeDeck(courseId, deck.deckId)
                    removeTarget = null
                }) { Text("Remove") }
            },
            dismissButton = { TextButton(onClick = { removeTarget = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun CourseDeckRow(
    deck: CourseDeckDto,
    onStudy: () -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    "${deck.position + 1}. ${deck.title}" + if (deck.locked) "  🔒" else "",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "${deck.masteredCount} / ${deck.cardCount} cards mastered",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (deck.locked) {
                Text("Locked", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Button(onClick = onStudy) { Text("Study") }
            }
            TextButton(onClick = onRemove) { Text("Remove") }
        }
    }
}
