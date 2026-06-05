package com.flashmd.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** Shows pending-review count; tapping requests a sync. Hidden state is up to the caller. */
@Composable
fun SyncStatusChip(pendingCount: Long, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val label = if (pendingCount > 0) "$pendingCount pending — sync now" else "Synced"
    AssistChip(
        onClick = onRetry,
        label = { Text(label) },
        modifier = modifier.padding(8.dp),
        colors = AssistChipDefaults.assistChipColors(),
    )
}
