package com.flashmd.ui.screens.learn

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.R
import com.flashmd.data.remote.dto.PassedStepDto
import com.flashmd.data.remote.dto.PausedStepDto
import com.flashmd.data.remote.dto.QuestionStepDto
import com.flashmd.data.remote.dto.RemediationStepDto
import com.flashmd.data.remote.dto.ReviewDoneStepDto
import com.flashmd.data.remote.dto.ScreenStepDto
import com.flashmd.data.remote.dto.StepDto
import com.flashmd.data.remote.dto.UnknownStepDto

/** One lesson, screen by screen, then its questions. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LessonScreen(
    onBack: () -> Unit,
    onOpenLesson: (String) -> Unit,
    viewModel: LessonViewModel = hiltViewModel(),
    images: LessonImages = rememberLessonImages(viewModel.subjectId),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    CompositionLocalProvider(LocalLessonImages provides images) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.title ?: "", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.learn_to_outline))
                    }
                },
            )
        },
    ) { padding ->
        LessonBody(
            state = state,
            actions = LessonActions(
                next = viewModel::next,
                back = viewModel::back,
                carryOn = viewModel::carryOn,
                pause = viewModel::pause,
                resume = viewModel::resume,
                answer = viewModel::answer,
                afterFeedback = viewModel::afterFeedback,
                comment = viewModel::comment,
                dismissComment = viewModel::dismissComment,
                toggleOpenBook = viewModel::toggleOpenBook,
                toOutline = onBack,
                openLesson = onOpenLesson,
            ),
            modifier = Modifier.padding(padding),
        )
    }
    }
}

class LessonActions(
    val next: () -> Unit,
    val back: () -> Unit,
    val carryOn: () -> Unit,
    val pause: () -> Unit,
    val resume: () -> Unit,
    val answer: (Int) -> Unit,
    val afterFeedback: () -> Unit,
    val comment: (String, String) -> Unit,
    val dismissComment: () -> Unit,
    val toggleOpenBook: () -> Unit,
    val toOutline: () -> Unit,
    val openLesson: (String) -> Unit,
)

/** Draws whatever step the server says the learner is on. Stateless, so it can be shown from any state. */
@Composable
fun LessonBody(state: LessonUiState, actions: LessonActions, modifier: Modifier = Modifier) {
    val scroll = rememberScrollState()
    val stepKey = stepIdentity(state)
    // A new screen or question starts at the top.
    LaunchedEffect(stepKey) { scroll.scrollTo(0) }

    val step = state.step
    Box(modifier.fillMaxSize()) {
        if (step == null && state.error == null) {
            CircularProgressIndicator(Modifier.align(Alignment.Center))
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(scroll).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }
            val feedback = state.feedback
            when {
                feedback != null -> QuestionPanel(
                    step = feedback.question,
                    answer = feedback.response.answer,
                    enabled = !state.busy,
                    onAnswer = actions.answer,
                    onContinue = actions.afterFeedback,
                    extra = {
                        if (feedback.response.answer.helpOffered && !feedback.response.passed) StuckNote(actions.pause)
                    },
                )
                step != null -> StepPanel(step, state, actions)
            }
        }
    }
}

/** Changes whenever the learner should be at the top of a new page. */
private fun stepIdentity(state: LessonUiState): String = when (val step = state.step) {
    is ScreenStepDto -> "screen-${step.number}"
    is RemediationStepDto -> "reread-${step.number}-${step.position}"
    is QuestionStepDto -> "q-${step.presentationId}-${step.misses}-${step.answered}"
    else -> step?.javaClass?.simpleName ?: "none"
} + if (state.feedback != null) "-feedback" else ""

@Composable
private fun StepPanel(step: StepDto, state: LessonUiState, actions: LessonActions) {
    when (step) {
        is ScreenStepDto -> ScreenPanel(
            label = stringResource(R.string.learn_screen_of, step.index + 1, step.total),
            number = step.number,
            blocks = step.blocks,
            state = state,
            actions = actions,
            canGoBack = step.canGoBack,
            nextLabel = stringResource(
                if (step.index + 1 == step.total) R.string.learn_start_questions else R.string.learn_next,
            ),
            onNext = actions.next,
            onBack = actions.back,
        )
        is RemediationStepDto -> ScreenPanel(
            label = stringResource(R.string.learn_reread, step.position + 1, step.of),
            number = step.number,
            blocks = step.blocks,
            state = state,
            actions = actions,
            canGoBack = false,
            nextLabel = stringResource(R.string.learn_continue),
            onNext = actions.carryOn,
            onBack = null,
            note = { if (step.helpOffered) StuckNote(actions.pause) },
        )
        is QuestionStepDto -> QuestionPanel(
            step = step,
            answer = null,
            enabled = !state.busy,
            onAnswer = actions.answer,
            onContinue = actions.afterFeedback,
            extra = {
                if (step.helpOffered) StuckNote(actions.pause)
                OpenBook(state, actions)
            },
        )
        is PassedStepDto -> PassedPanel(step, state.unlocked, actions)
        PausedStepDto -> PausedPanel(actions)
        is ReviewDoneStepDto, is UnknownStepDto -> Unit
    }
}

@Composable
private fun ScreenPanel(
    label: String,
    number: String,
    blocks: List<com.flashmd.data.remote.dto.BlockDto>,
    state: LessonUiState,
    actions: LessonActions,
    canGoBack: Boolean,
    nextLabel: String,
    onNext: () -> Unit,
    onBack: (() -> Unit)?,
    note: @Composable () -> Unit = {},
) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                label,
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                stringResource(R.string.learn_screen_number, number),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            LessonBlocks(blocks)
            note()
            CommentOnScreen(number, state.comment, actions)
        }
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        if (onBack != null) {
            OutlinedButton(onClick = onBack, enabled = !state.busy && canGoBack) {
                Text(stringResource(R.string.learn_back))
            }
        }
        Button(onClick = onNext, enabled = !state.busy, modifier = Modifier.weight(1f)) { Text(nextLabel) }
    }
}

/** Shown from the second miss. "I need more on this" arrives with help requests. */
@Composable
fun StuckNote(onPause: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(stringResource(R.string.learn_stuck_note), style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = onPause) { Text(stringResource(R.string.learn_come_back_later)) }
        }
    }
}

@Composable
private fun PassedPanel(step: PassedStepDto, unlocked: List<com.flashmd.data.remote.dto.UnlockedLessonDto>, actions: LessonActions) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(R.string.learn_passed_title),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.semantics { heading() },
            )
            Text(stringResource(R.string.learn_passed_result, step.firstTryRight, step.total))
            Text(
                stringResource(R.string.learn_passed_review_note),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (unlocked.isNotEmpty()) {
                Text(stringResource(R.string.learn_now_open), fontWeight = FontWeight.SemiBold)
                unlocked.forEach { lesson ->
                    TextButton(onClick = { actions.openLesson(lesson.slug) }) { Text(lesson.title) }
                }
            }
            Button(onClick = actions.toOutline, Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.learn_to_outline))
            }
        }
    }
}

@Composable
private fun PausedPanel(actions: LessonActions) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(R.string.learn_paused_title),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.semantics { heading() },
            )
            Text(stringResource(R.string.learn_paused_body))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = actions.toOutline) { Text(stringResource(R.string.learn_to_outline)) }
                Button(onClick = actions.resume, Modifier.weight(1f)) { Text(stringResource(R.string.learn_resume)) }
            }
        }
    }
}
