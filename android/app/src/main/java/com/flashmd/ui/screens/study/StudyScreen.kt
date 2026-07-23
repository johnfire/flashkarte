package com.flashmd.ui.screens.study

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.R
import com.flashmd.data.local.StudyMode
import com.flashmd.domain.study.StudyOption
import com.flashmd.ui.theme.RatingColor

private val RATING_LABELS = mapOf(1 to "Again", 2 to "Hard", 3 to "Good", 4 to "Easy", 5 to "Perfect")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyScreen(
    deckId: String,
    onBack: () -> Unit,
    onSessionDone: (reviewed: Int, c1: Int, c2: Int, c3: Int, c4: Int, c5: Int) -> Unit,
    viewModel: StudyViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(state.isDone) {
        if (state.isDone) {
            val c = state.ratingCounts
            onSessionDone(
                state.reviewed,
                c[1] ?: 0, c[2] ?: 0, c[3] ?: 0, c[4] ?: 0, c[5] ?: 0,
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.deckTitle) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        if (state.error != null) {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            ) {
                Text(
                    state.error!!,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyLarge,
                )
                Button(onClick = onBack) { Text("Back") }
            }
            return@Scaffold
        }
        if (state.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }
        Column(
            Modifier.fillMaxSize().padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Progress bar
            val progress = if (state.remaining + state.reviewed > 0)
                state.reviewed.toFloat() / (state.reviewed + state.remaining)
            else 0f
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth(),
            )

            Text(
                "${state.reviewed} done  •  ${state.remaining} remaining",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
            )

            SingleChoiceSegmentedButtonRow(Modifier.padding(bottom = 8.dp)) {
                SegmentedButton(
                    selected = state.mode == StudyMode.FLIP,
                    onClick = { viewModel.setMode(StudyMode.FLIP) },
                    shape = SegmentedButtonDefaults.itemShape(0, 2),
                ) { Text("Flip") }
                SegmentedButton(
                    selected = state.mode == StudyMode.CHOICE,
                    onClick = { viewModel.setMode(StudyMode.CHOICE) },
                    shape = SegmentedButtonDefaults.itemShape(1, 2),
                ) { Text("Choice") }
            }

            // Card
            val card = state.currentCard
            val remediation = state.remediation
            if (remediation != null) {
                // Spec 01: remediation interlude — front + back shown together,
                // one Continue button, no rating.
                RemediationInterlude(
                    front = remediation.front,
                    back = remediation.back,
                    onContinue = { viewModel.continueFromRemediation() },
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                )
            } else if (card != null) {
                if (state.mode == StudyMode.CHOICE) {
                    ChoicePanel(
                        front = card.card.front,
                        options = state.options,
                        selectedIndex = state.selectedIndex,
                        onChoose = { viewModel.chooseAnswer(it) },
                        onContinue = { viewModel.next() },
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                    )
                } else {
                    FlipCard(
                        front = card.card.front,
                        back = card.card.back,
                        isFlipped = state.isFlipped,
                        onClick = { viewModel.flip() },
                        modifier = Modifier
                            .weight(1f)
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                    )

                    // Rating buttons — only shown after flip
                    if (state.isFlipped) {
                        RatingRow(onRate = { viewModel.rate(it) })
                        Text(
                            stringResource(R.string.study_rating_hint),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(bottom = 12.dp),
                        )
                    } else {
                        Text(
                            "Tap card to reveal answer",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(bottom = 24.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChoicePanel(
    front: String,
    options: List<StudyOption>,
    selectedIndex: Int?,
    onChoose: (Int) -> Unit,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier.fillMaxWidth().weight(1f),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            tonalElevation = 4.dp,
        ) {
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    "QUESTION",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    front,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        options.forEachIndexed { index, option ->
            val answered = selectedIndex != null
            val container = when {
                !answered -> MaterialTheme.colorScheme.surfaceVariant
                option.correct -> Color(0xFF2E7D32)
                index == selectedIndex -> Color(0xFFC62828)
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
            Button(
                onClick = { onChoose(index) },
                enabled = !answered,
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = container,
                    disabledContainerColor = container,
                ),
            ) { Text(option.text, textAlign = TextAlign.Center) }
        }
        if (selectedIndex != null) {
            Spacer(Modifier.height(8.dp))
            Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) { Text("Continue") }
        }
    }
}

/** Spec 01 remediation interlude: shows a specific-confusion card's front and
 *  back together with a single Continue button. No rating, no review event. */
@Composable
private fun RemediationInterlude(
    front: String,
    back: String,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier.fillMaxWidth().weight(1f),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            tonalElevation = 4.dp,
        ) {
            Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    "LET'S CLEAR THIS UP",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    front,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    back,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) { Text("Continue") }
    }
}

@Composable
private fun FlipCard(
    front: String,
    back: String,
    isFlipped: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val rotation by animateFloatAsState(
        targetValue = if (isFlipped) 180f else 0f,
        animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing),
        label = "cardFlip",
    )

    Box(
        modifier = modifier
            .graphicsLayer {
                rotationY = rotation
                cameraDistance = 12f * density
            }
            .clickable(enabled = !isFlipped) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        if (rotation <= 90f) {
            // Front face
            CardFace(text = front, label = "QUESTION")
        } else {
            // Back face — counter-rotate so text reads correctly
            Box(modifier = Modifier.graphicsLayer { rotationY = 180f }.fillMaxSize()) {
                CardFace(text = back, label = "ANSWER")
            }
        }
    }
}

@Composable
private fun CardFace(text: String, label: String) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        tonalElevation = 4.dp,
    ) {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 16.dp),
            )
            Text(
                text,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                fontWeight = if (label == "QUESTION") FontWeight.Bold else FontWeight.Normal,
            )
        }
    }
}

@Composable
private fun RatingRow(onRate: (Int) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
    ) {
        for (r in 1..5) {
            val color = RatingColor[r] ?: MaterialTheme.colorScheme.primary
            Button(
                onClick = { onRate(r) },
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = color,
                    contentColor = Color(0xFF1E1E2E),
                ),
                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 10.dp),
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$r", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    Text(RATING_LABELS[r] ?: "", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}
