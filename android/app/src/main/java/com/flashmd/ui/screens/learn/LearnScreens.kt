package com.flashmd.ui.screens.learn

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.R
import com.flashmd.data.remote.dto.LearnerLessonDto

/** Your subjects, each opening on its outline. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LearnScreen(
    onBack: () -> Unit,
    onOpenSubject: (String) -> Unit,
    viewModel: LearnSubjectsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(topBar = { LearnTopBar(stringResource(R.string.learn_title), onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.learn_intro), color = MaterialTheme.colorScheme.onSurfaceVariant)
            when {
                state.isLoading && state.subjects.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                state.error != null && state.subjects.isEmpty() ->
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                state.subjects.isEmpty() -> Text(stringResource(R.string.learn_empty))
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.subjects, key = { it.id }) { subject ->
                        Card(
                            Modifier.fillMaxWidth().clickable { onOpenSubject(subject.id) },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        ) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(
                                    listOfNotNull(subject.title, subject.referenceNumber?.let { "#$it" }).joinToString("  "),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                subject.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                                Text(
                                    pluralStringResource(R.plurals.learn_concept_count, subject.conceptCount, subject.conceptCount),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun LearnTopBar(title: String, onBack: () -> Unit) {
    TopAppBar(
        title = { Text(title, fontWeight = FontWeight.Bold) },
        navigationIcon = {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.help_back))
            }
        },
    )
}

/** What you are going to learn, in order, and where you are in it. */
@Composable
fun OutlineScreen(
    onBack: () -> Unit,
    onOpenLesson: (String) -> Unit,
    onReadLesson: (String) -> Unit,
    onReviews: () -> Unit,
    viewModel: OutlineViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val outline = state.outline
    // Coming back from a lesson: states and due reviews may have changed.
    androidx.compose.runtime.LaunchedEffect(Unit) { if (outline != null) viewModel.refresh() }
    Scaffold(topBar = { LearnTopBar(outline?.subjectTitle ?: "", onBack) }) { padding ->
        when {
            outline == null && state.isLoading ->
                Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) { CircularProgressIndicator() }
            outline == null ->
                Text(state.error ?: "", Modifier.padding(padding).padding(16.dp), color = MaterialTheme.colorScheme.error)
            else -> OutlineContent(outline, onOpenLesson, onReadLesson, onReviews, Modifier.padding(padding))
        }
    }
}

@Composable
fun OutlineContent(
    outline: com.flashmd.data.remote.dto.LearnerOutlineDto,
    onOpenLesson: (String) -> Unit,
    onReadLesson: (String) -> Unit,
    onReviews: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val lessonCount = outline.modules.sumOf { it.lessons.size }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text(stringResource(R.string.learn_outline_intro), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        if (outline.reviewsDue > 0) {
            item {
                OutlinedCard(Modifier.fillMaxWidth().clickable(onClick = onReviews)) {
                    Text(
                        pluralStringResource(R.plurals.learn_reviews_due, outline.reviewsDue, outline.reviewsDue),
                        Modifier.padding(16.dp),
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
        if (lessonCount == 0) item { Text(stringResource(R.string.learn_no_lessons)) }
        outline.modules.forEach { module ->
            item {
                Text(
                    module.title ?: stringResource(R.string.learn_other_lessons),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 12.dp).semantics { heading() },
                )
            }
            items(module.lessons, key = { it.id }) { lesson ->
                LessonRow(lesson, onOpenLesson, onReadLesson)
            }
        }
    }
}

@Composable
private fun LessonRow(lesson: LearnerLessonDto, onOpen: (String) -> Unit, onRead: (String) -> Unit) {
    val stateLabel = when (lesson.access) {
        "locked" -> stringResource(R.string.learn_state_locked)
        "available" -> stringResource(R.string.learn_state_available)
        "in_progress" ->
            stringResource(R.string.learn_state_in_progress) +
                if (lesson.paused) " · " + stringResource(R.string.learn_state_paused) else ""
        "passed" -> stringResource(R.string.learn_state_passed)
        else -> lesson.access
    }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(lesson.title, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(stateLabel, style = MaterialTheme.typography.labelMedium)
            }
            Text(lesson.summary, style = MaterialTheme.typography.bodyMedium)
            if (lesson.covers.isNotEmpty()) {
                Text(
                    stringResource(R.string.learn_covers, lesson.covers.joinToString(", ")),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (lesson.stage == "testing") {
                Text(
                    stringResource(R.string.learn_testing_stage),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (lesson.access == "locked") {
                val waiting = lesson.unlocksAfter.filter { !it.passed }.joinToString(", ") { it.title }
                Text(stringResource(R.string.learn_unlocks_after, waiting), style = MaterialTheme.typography.bodyMedium)
            }
            if (lesson.access == "passed" && lesson.result != null) {
                Text(
                    stringResource(R.string.learn_first_try, lesson.result.firstTryRight, lesson.result.total),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            when (lesson.access) {
                "available" -> TextButton(onClick = { onOpen(lesson.slug) }) { Text(stringResource(R.string.learn_start)) }
                "in_progress" -> TextButton(onClick = { onOpen(lesson.slug) }) { Text(stringResource(R.string.learn_continue_lesson)) }
                "passed" -> TextButton(onClick = { onRead(lesson.slug) }) { Text(stringResource(R.string.learn_read_again)) }
            }
        }
    }
}

/** Every screen of a passed lesson, for looking back. */
@Composable
fun ReadLessonScreen(
    onBack: () -> Unit,
    viewModel: ReadLessonViewModel = hiltViewModel(),
    images: LessonImages = rememberLessonImages(viewModel.subjectId),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    androidx.compose.runtime.CompositionLocalProvider(LocalLessonImages provides images) {
    Scaffold(topBar = { LearnTopBar(state.lesson?.lesson?.title ?: "", onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (state.isLoading) CircularProgressIndicator()
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            state.lesson?.screens?.forEach { screen ->
                Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            stringResource(R.string.learn_screen_number, screen.number),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        LessonBlocks(screen.blocks)
                        ScreenOrigin(screen.addedInAnswer, screen.sources)
                    }
                }
            }
        }
    }
    }
}
