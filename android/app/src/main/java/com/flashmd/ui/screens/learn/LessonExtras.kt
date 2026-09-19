package com.flashmd.ui.screens.learn

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.flashmd.R

/**
 * The owner notes what is unclear or wrong about a screen, against its permanent number. Their AI
 * reads it later and answers it (usually with a clarifying screen numbered next to this one).
 */
@Composable
fun CommentOnScreen(number: String, comment: CommentState, actions: LessonActions) {
    var open by rememberSaveable(number) { mutableStateOf(false) }
    var body by rememberSaveable(number) { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (comment is CommentState.Saved && comment.number == number && !open) {
            Text(
                stringResource(R.string.learn_comment_saved, number),
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        if (!open) {
            TextButton(onClick = { open = true; actions.dismissComment() }) {
                Text(stringResource(R.string.learn_comment_open, number))
            }
        } else {
            OutlinedTextField(
                value = body,
                onValueChange = { body = it.take(2000) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.learn_comment_label, number)) },
                minLines = 3,
            )
            if (comment is CommentState.Failed) {
                Text(comment.message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        actions.comment(number, body)
                        body = ""
                        open = false
                    },
                    enabled = body.isNotBlank() && comment != CommentState.Saving,
                ) { Text(stringResource(R.string.learn_comment_send)) }
                TextButton(onClick = { open = false }) { Text(stringResource(R.string.learn_comment_cancel)) }
            }
        }
    }
}

/** Open book: while answering, the learner may reopen the lesson's screens. This is learning, not an exam. */
@Composable
fun OpenBook(state: LessonUiState, actions: LessonActions) {
    val book = state.openBook
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TextButton(onClick = actions.toggleOpenBook) {
            Text(
                stringResource(
                    if (book is OpenBookState.Closed || book is OpenBookState.Failed) R.string.learn_show_screens
                    else R.string.learn_hide_screens,
                ),
            )
        }
        when (book) {
            OpenBookState.Loading -> Text(stringResource(R.string.learn_loading))
            OpenBookState.Failed -> Text(stringResource(R.string.learn_load_error), color = MaterialTheme.colorScheme.error)
            is OpenBookState.Open -> Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    book.screens.screens.forEach { screen ->
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                stringResource(R.string.learn_screen_number, screen.number),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            LessonBlocks(screen.blocks)
                        }
                    }
                }
            }
            OpenBookState.Closed -> Unit
        }
    }
}
