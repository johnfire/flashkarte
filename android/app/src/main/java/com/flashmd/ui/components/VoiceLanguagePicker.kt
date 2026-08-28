package com.flashmd.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ExposedDropdownMenuBoxScope
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import com.flashmd.R
import java.util.Locale

/**
 * Language picker backed by the voices actually installed on this device.
 *
 * Two deliberate fallbacks. A stored tag with no installed voice is still
 * offered and flagged rather than dropped — silently discarding the user's own
 * setting because this particular device lacks the voice would be worse than
 * saying so. And if the engine reports no languages at all (not yet
 * initialised, or absent), the control degrades to a free-text field so the
 * user is never blocked from configuring a deck.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceLanguagePicker(
    label: String,
    value: String?,
    available: List<String>,
    emptyLabel: String,
    onChange: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (available.isEmpty()) {
        var draft by remember(value) { mutableStateOf(value.orEmpty()) }
        OutlinedTextField(
            value = draft,
            onValueChange = {
                draft = it
                onChange(it.trim().ifEmpty { null })
            },
            singleLine = true,
            label = { Text(label) },
            supportingText = { Text(stringResource(R.string.speech_no_voice_list)) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            modifier = modifier.fillMaxWidth(),
        )
        return
    }

    var expanded by remember { mutableStateOf(false) }
    val missing = value != null && value !in available
    val options = buildList {
        add(null)
        if (missing) add(value)
        addAll(available)
    }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier,
    ) {
        OutlinedTextField(
            value = value?.let(::describe) ?: emptyLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            supportingText = if (missing) {
                { Text(stringResource(R.string.speech_no_voice)) }
            } else {
                null
            },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
            modifier = Modifier.menuAnchor().fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { tag ->
                DropdownMenuItem(
                    text = {
                        Text(
                            tag?.let(::describe) ?: emptyLabel,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    },
                    onClick = {
                        expanded = false
                        onChange(tag)
                    },
                )
            }
        }
    }
}

/** "de-DE" -> "German (de-DE)", falling back to the bare tag. */
private fun describe(tag: String): String {
    val name = runCatching {
        Locale.forLanguageTag(tag).getDisplayName(Locale.getDefault())
    }.getOrNull()
    return if (name.isNullOrBlank() || name == tag) tag else "$name ($tag)"
}
