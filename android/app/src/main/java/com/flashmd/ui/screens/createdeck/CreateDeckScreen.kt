package com.flashmd.ui.screens.createdeck

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateDeckScreen(
    onDone: () -> Unit,
    onHowTo: () -> Unit,
    viewModel: CreateDeckViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var tab by remember { mutableIntStateOf(0) }

    LaunchedEffect(state.done) { if (state.done) onDone() }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val stream = context.contentResolver.openInputStream(uri)
            ?: return@rememberLauncherForActivityResult
        val text = stream.bufferedReader().use { it.readText() }
        viewModel.onMarkdownChange(text)
        tab = 0
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New deck") },
                navigationIcon = { TextButton(onClick = onDone) { Text("Cancel") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Paste Markdown") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Import file") })
            }

            if (tab == 1) {
                Button(onClick = { filePicker.launch(arrayOf("text/*", "text/markdown")) }) {
                    Text("Choose .md file")
                }
                Text(
                    "Picks a Markdown file and loads it below for review.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            OutlinedTextField(
                value = state.markdown,
                onValueChange = viewModel::onMarkdownChange,
                modifier = Modifier.fillMaxWidth().heightIn(min = 200.dp),
                label = { Text("Markdown") },
                placeholder = { Text("# My Deck\n\nQ: Question\nA: Answer") },
            )

            Text(
                "${state.cardCount} cards detected",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (state.error != null) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }

            Button(
                onClick = { viewModel.create() },
                enabled = state.cardCount > 0 && !state.isSaving,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isSaving) CircularProgressIndicator(Modifier.size(20.dp))
                else Text("Create deck")
            }

            TextButton(onClick = onHowTo, modifier = Modifier.fillMaxWidth()) {
                Text("How to make a branching deck")
            }
        }
    }
}
