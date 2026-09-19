package com.flashmd.ui.screens.learn

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.flashmd.R
import com.flashmd.data.remote.dto.HelpNoticeDto
import com.flashmd.data.remote.dto.ScreenSourceDto

/**
 * "I need more on this". The learner asks their own AI to explain more, with an optional note. MCP
 * is pull-only, so the request waits in a queue until their AI next runs; this says so plainly,
 * shows where an answer landed, and offers a ready-made message to paste to their AI.
 */
@Composable
fun NeedMoreOnThis(
    target: HelpTarget,
    notices: List<HelpNoticeDto>,
    help: HelpState,
    prompt: String,
    actions: LessonActions,
    modifier: Modifier = Modifier,
) {
    var open by rememberSaveable(target.toString()) { mutableStateOf(false) }
    var note by rememberSaveable(target.toString()) { mutableStateOf("") }
    var copied by rememberSaveable(target.toString()) { mutableStateOf(false) }
    val clipboard = LocalClipboardManager.current
    val waiting = help is HelpState.Sent || notices.any { it.status == "open" }

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        notices.filter { it.status == "answered" }.forEach { notice ->
            Text(
                stringResource(R.string.learn_help_answered, notice.answers.joinToString(", ")),
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        if (waiting) {
            Text(stringResource(R.string.learn_help_waiting), style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = { clipboard.setText(AnnotatedString(prompt)); copied = true }) {
                Text(stringResource(if (copied) R.string.learn_help_copied else R.string.learn_help_copy_prompt))
            }
        } else if (!open) {
            OutlinedButton(onClick = { open = true; actions.dismissHelp() }) {
                Text(stringResource(R.string.learn_help_open))
            }
        } else {
            OutlinedTextField(
                value = note,
                onValueChange = { note = it.take(1000) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.learn_help_label)) },
                minLines = 3,
            )
            Text(
                stringResource(R.string.learn_help_how),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (help is HelpState.Failed) {
                Text(help.message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { actions.askForMore(target, note); open = false; note = "" },
                    enabled = help != HelpState.Sending,
                ) { Text(stringResource(R.string.learn_help_send)) }
                TextButton(onClick = { open = false }) { Text(stringResource(R.string.learn_comment_cancel)) }
            }
        }
    }
}

/** Only links a person can safely follow. */
internal fun isWebLink(url: String?): Boolean = url != null && url.startsWith("https://", ignoreCase = true)

/**
 * Where a screen came from. One added in answer to a "need more" request says so (and who wrote it);
 * any screen with sources lists them, tucked away until wanted.
 */
@Composable
fun ScreenOrigin(addedInAnswer: String?, sources: List<ScreenSourceDto>?, modifier: Modifier = Modifier) {
    val list = sources.orEmpty()
    if (addedInAnswer == null && list.isEmpty()) return
    var expanded by rememberSaveable(list.joinToString { it.title }) { mutableStateOf(false) }
    val uri = LocalUriHandler.current
    Column(modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (addedInAnswer != null) {
            Text(
                stringResource(if (addedInAnswer == "ai") R.string.learn_added_by_ai else R.string.learn_added_in_answer),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
            )
        }
        if (list.isNotEmpty()) {
            TextButton(onClick = { expanded = !expanded }) {
                Text(pluralStringResource(R.plurals.learn_sources, list.size, list.size))
            }
            if (expanded) {
                list.forEach { source ->
                    if (isWebLink(source.url)) {
                        TextButton(onClick = { uri.openUri(source.url!!) }) { Text(source.title) }
                    } else {
                        Text("• ${source.title}", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
