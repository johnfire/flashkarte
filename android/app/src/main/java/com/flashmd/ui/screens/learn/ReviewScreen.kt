package com.flashmd.ui.screens.learn

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.R
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.RemediationStepDto
import com.flashmd.data.remote.dto.ReviewDoneStepDto

/** Questions that have come due, asked one at a time. */
@Composable
fun ReviewScreen(
    onBack: () -> Unit,
    viewModel: ReviewViewModel = hiltViewModel(),
    images: LessonImages = rememberLessonImages(viewModel.subjectId),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    androidx.compose.runtime.CompositionLocalProvider(LocalLessonImages provides images) {
    Scaffold(topBar = { LearnTopBar(stringResource(R.string.learn_review_title), onBack) }) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            if (state.busy && state.step == null && state.feedback == null) {
                CircularProgressIndicator(Modifier.align(Alignment.Center))
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                if (state.nothingDue && state.step == null) Text(stringResource(R.string.learn_nothing_due))
                val feedback = state.feedback
                val step = state.step
                when {
                    feedback != null -> QuestionPanel(
                        step = feedback.question,
                        answer = feedback.response.answer,
                        enabled = !state.busy,
                        onAnswer = viewModel::answer,
                        onContinue = viewModel::afterFeedback,
                    )
                    step is QuestionStepDto -> QuestionPanel(
                        step = step,
                        answer = null,
                        enabled = !state.busy,
                        onAnswer = viewModel::answer,
                        onContinue = viewModel::afterFeedback,
                    )
                    step is RemediationStepDto -> {
                        Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(
                                    stringResource(R.string.learn_reread, step.position + 1, step.of),
                                    style = MaterialTheme.typography.titleSmall,
                                    modifier = Modifier.semantics { heading() },
                                )
                                Text(
                                    stringResource(R.string.learn_screen_number, step.number),
                                    style = MaterialTheme.typography.labelSmall,
                                )
                                LessonBlocks(step.blocks)
                            }
                        }
                        Button(onClick = viewModel::carryOn, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                            Text(stringResource(R.string.learn_continue))
                        }
                    }
                    step is ReviewDoneStepDto -> Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(stringResource(R.string.learn_review_done), style = MaterialTheme.typography.titleMedium)
                            Button(onClick = viewModel::begin, Modifier.fillMaxWidth()) {
                                Text(stringResource(R.string.learn_next_review))
                            }
                        }
                    }
                    else -> Unit
                }
            }
        }
    }
    }
}
