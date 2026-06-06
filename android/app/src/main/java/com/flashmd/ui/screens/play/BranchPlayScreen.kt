package com.flashmd.ui.screens.play

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BranchPlayScreen(
    onBack: () -> Unit,
    viewModel: BranchPlayViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scenario") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Close") } },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                state.isLoading ->
                    CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
                state.error != null ->
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                state.isComplete -> {
                    Text("Path complete.", style = MaterialTheme.typography.headlineSmall)
                    Button(onClick = viewModel::restart, modifier = Modifier.fillMaxWidth()) {
                        Text("Restart")
                    }
                }
                else -> {
                    val node = state.current
                    if (node != null) {
                        Text(node.prompt, style = MaterialTheme.typography.titleLarge)
                        if (node.type == "branch") {
                            node.options.forEach { opt ->
                                Button(
                                    onClick = { viewModel.choose(opt) },
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text(opt.text) }
                            }
                        } else {
                            if (node.back.isNotBlank()) {
                                Text(node.back, style = MaterialTheme.typography.bodyLarge)
                            }
                            Button(
                                onClick = viewModel::finishLeaf,
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text("Done") }
                        }
                        if (state.canGoBack) {
                            OutlinedButton(
                                onClick = viewModel::back,
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text("Back") }
                        }
                    }
                }
            }
        }
    }
}
