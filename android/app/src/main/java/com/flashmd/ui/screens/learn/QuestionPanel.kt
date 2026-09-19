package com.flashmd.ui.screens.learn

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.flashmd.R
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.RevealedAnswerDto

/**
 * One question: pick an option, then see whether it was right and why. Nothing here knows the
 * right answer until the server says so in the reply. The verdict is written out, never colour
 * alone.
 */
@Composable
fun QuestionPanel(
    step: QuestionStepDto,
    answer: RevealedAnswerDto?,
    enabled: Boolean,
    onAnswer: (Int) -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
    extra: @Composable () -> Unit = {},
) {
    // A new question (or a re-ask) starts with nothing chosen.
    var chosen by rememberSaveable(step.presentationId, step.misses, step.answered) { mutableStateOf<Int?>(null) }
    Card(modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                stringResource(R.string.learn_question_progress, minOf(step.answered + 1, step.total), step.total),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            LessonBlocks(step.prompt)
            Column(Modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                step.options.forEachIndexed { position, option ->
                    val revealed = answer != null
                    val isRight = revealed && position == answer!!.correctPosition
                    val isWrongPick = revealed && position == answer!!.chosenPosition && !answer.correct
                    val selected = if (revealed) position == answer!!.chosenPosition else chosen == position
                    val border = when {
                        isRight -> BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                        isWrongPick -> BorderStroke(2.dp, MaterialTheme.colorScheme.error)
                        else -> BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    }
                    Card(
                        Modifier.fillMaxWidth().selectable(
                            selected = selected,
                            enabled = enabled && !revealed,
                            role = Role.RadioButton,
                            onClick = { chosen = position },
                        ),
                        border = border,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    ) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                            RadioButton(selected = selected, onClick = null, enabled = enabled && !revealed)
                            Column(Modifier.padding(start = 8.dp).weight(1f)) {
                                LessonBlocks(option.blocks)
                                if (isRight) {
                                    Text(
                                        stringResource(R.string.learn_right_option),
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary,
                                    )
                                }
                                if (isWrongPick) {
                                    Text(
                                        stringResource(R.string.learn_wrong_option),
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.error,
                                    )
                                }
                            }
                        }
                    }
                }
            }
            if (answer != null) {
                AnswerVerdict(answer)
                Button(onClick = onContinue, Modifier.fillMaxWidth()) {
                    Text(stringResource(if (answer.correct) R.string.learn_continue else R.string.learn_review_screens))
                }
            } else {
                Button(
                    onClick = { chosen?.let(onAnswer) },
                    enabled = enabled && chosen != null,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.learn_check_answer)) }
            }
            extra()
        }
    }
}

@Composable
private fun AnswerVerdict(answer: RevealedAnswerDto) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            stringResource(if (answer.correct) R.string.learn_correct else R.string.learn_not_quite),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        LessonBlocks(answer.reason)
        if (!answer.correct) {
            Text(stringResource(R.string.learn_why_right_one), style = MaterialTheme.typography.labelLarge)
            LessonBlocks(answer.correctReason)
        }
        Spacer(Modifier.height(4.dp))
    }
}
