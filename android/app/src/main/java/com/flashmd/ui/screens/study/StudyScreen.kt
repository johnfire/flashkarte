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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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

            // Card
            val card = state.currentCard
            if (card != null) {
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
