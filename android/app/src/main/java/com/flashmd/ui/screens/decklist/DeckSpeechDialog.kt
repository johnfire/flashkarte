package com.flashmd.ui.screens.decklist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.flashmd.R
import com.flashmd.domain.model.Deck
import com.flashmd.domain.speech.SpeechResolver
import com.flashmd.ui.components.VoiceLanguagePicker

/**
 * Per-deck speech overrides.
 *
 * The two language fields are the point of the feature: a de→en deck spoken
 * with one voice would pronounce the English side as German. The on/off control
 * is tri-state — "use my global setting" has to be expressible, or a learner
 * could not mute one deck while leaving the rest speaking.
 */
@Composable
fun DeckSpeechDialog(
    deck: Deck,
    availableLanguages: List<String>,
    onDismiss: () -> Unit,
    onSave: (
        enabled: Boolean?,
        front: String?,
        back: String?,
        autoplay: String?,
        rate: Double?,
    ) -> Unit,
) {
    var enabled by rememberSaveable(deck.id) { mutableStateOf(deck.speechEnabled) }
    var front by rememberSaveable(deck.id) { mutableStateOf(deck.speechFrontLang) }
    var back by rememberSaveable(deck.id) { mutableStateOf(deck.speechBackLang) }
    var autoplay by rememberSaveable(deck.id) { mutableStateOf(deck.speechAutoplay) }
    // A slider cannot express "inherit", so the override is opt-in: unchecked
    // leaves the rate null and the deck follows the global speed.
    var rate by rememberSaveable(deck.id) { mutableStateOf(deck.speechRate) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.deck_speech_title)) },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.verticalScroll(rememberScrollState()),
            ) {
                Text(
                    stringResource(R.string.deck_speech_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    stringResource(R.string.deck_speech_enabled),
                    style = MaterialTheme.typography.labelLarge,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TriStateChip(
                        selected = enabled == null,
                        label = stringResource(R.string.deck_speech_inherit),
                    ) { enabled = null }
                    TriStateChip(
                        selected = enabled == true,
                        label = stringResource(R.string.deck_speech_on),
                    ) { enabled = true }
                    TriStateChip(
                        selected = enabled == false,
                        label = stringResource(R.string.deck_speech_off),
                    ) { enabled = false }
                }
                VoiceLanguagePicker(
                    label = stringResource(R.string.deck_speech_front),
                    value = front,
                    available = availableLanguages,
                    emptyLabel = stringResource(R.string.deck_speech_inherit),
                    onChange = { front = it },
                )
                VoiceLanguagePicker(
                    label = stringResource(R.string.deck_speech_back),
                    value = back,
                    available = availableLanguages,
                    emptyLabel = stringResource(R.string.deck_speech_inherit),
                    onChange = { back = it },
                )

                Text(
                    stringResource(R.string.speech_autoplay),
                    style = MaterialTheme.typography.labelLarge,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TriStateChip(
                        selected = autoplay == null,
                        label = stringResource(R.string.deck_speech_inherit),
                    ) { autoplay = null }
                    SpeechResolver.AUTOPLAY_MODES.forEach { mode ->
                        TriStateChip(
                            selected = autoplay == mode,
                            label = autoplayLabel(mode),
                        ) { autoplay = mode }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Checkbox(
                        checked = rate == null,
                        onCheckedChange = {
                            rate = if (it) null else SpeechResolver.DEFAULT_RATE
                        },
                    )
                    Text(stringResource(R.string.deck_speech_rate_inherit))
                }
                rate?.let { current ->
                    Text(
                        "${stringResource(R.string.speech_rate)}: ${"%.2f".format(current)}×",
                        style = MaterialTheme.typography.labelLarge,
                    )
                    Slider(
                        value = current.toFloat(),
                        onValueChange = { rate = it.toDouble() },
                        valueRange = SpeechResolver.MIN_RATE.toFloat()..
                            SpeechResolver.MAX_RATE.toFloat(),
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onSave(
                        enabled,
                        front,
                        back,
                        autoplay,
                        rate?.let { SpeechResolver.clampRate(it) },
                    )
                },
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun TriStateChip(selected: Boolean, label: String, onClick: () -> Unit) {
    FilterChip(selected = selected, onClick = onClick, label = { Text(label) })
}

@Composable
private fun autoplayLabel(mode: String): String = stringResource(
    when (mode) {
        "off" -> R.string.speech_autoplay_off
        "front" -> R.string.speech_autoplay_front
        "back" -> R.string.speech_autoplay_back
        else -> R.string.speech_autoplay_both
    },
)
