package com.flashmd.ui.screens.courses

import androidx.compose.foundation.clickable
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
import com.flashmd.data.remote.dto.CourseSummaryDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoursesScreen(
    onOpenCourse: (String) -> Unit,
    onBrowsePublic: () -> Unit,
    viewModel: CoursesViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var newTitle by remember { mutableStateOf("") }
    var deleteTarget by remember { mutableStateOf<CourseSummaryDto?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Courses", fontWeight = FontWeight.Bold) },
                actions = {
                    TextButton(onClick = onBrowsePublic) { Text("Browse public") }
                },
            )
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newTitle,
                    onValueChange = { newTitle = it },
                    modifier = Modifier.weight(1f),
                    label = { Text("New course title") },
                    singleLine = true,
                )
                Spacer(Modifier.width(8.dp))
                Button(
                    onClick = { viewModel.create(newTitle); newTitle = "" },
                    enabled = !state.isCreating && newTitle.isNotBlank(),
                ) { Text("Create") }
            }

            when {
                state.isLoading && state.courses.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                state.error != null && state.courses.isEmpty() ->
                    Box(Modifier.fillMaxSize().padding(24.dp), Alignment.Center) {
                        Text(state.error!!, color = MaterialTheme.colorScheme.error)
                    }
                state.courses.isEmpty() ->
                    Box(Modifier.fillMaxSize().padding(24.dp), Alignment.Center) {
                        Text(
                            "No courses yet. Create one, or ask your AI assistant to build one for you.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(state.courses, key = { it.id }) { course ->
                        Card(
                            Modifier.fillMaxWidth().clickable { onOpenCourse(course.id) },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(course.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        "${course.decksMastered} / ${course.decksTotal} decks mastered",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                TextButton(onClick = { deleteTarget = course }) { Text("Delete") }
                            }
                        }
                    }
                }
            }
        }
    }

    deleteTarget?.let { course ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete course?") },
            text = { Text("This permanently deletes \"${course.title}\". Its decks are not deleted.") },
            confirmButton = {
                TextButton(onClick = { viewModel.delete(course.id); deleteTarget = null }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Cancel") } },
        )
    }
}
