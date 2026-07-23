package com.flashmd.ui.screens.help

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.flashmd.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpScreen(onBack: () -> Unit, onOpenBranchingHelp: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.help_title), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text(stringResource(R.string.help_back)) }
                },
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            GettingStartedSection()
            WritingDecksSection()
            BranchingSection(onOpenBranchingHelp)
            StudyingSection()
            AiSection()
            SharingSection()
        }
    }
}

@Composable
internal fun TopicTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
}

@Composable
internal fun SectionHeading(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium)
}

@Composable
internal fun Body(text: String) {
    Text(text, style = MaterialTheme.typography.bodyMedium)
}

@Composable
internal fun Bullet(text: String) {
    Row {
        Text("•  ", style = MaterialTheme.typography.bodyMedium)
        Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}

@Composable
internal fun CodeBlock(text: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(12.dp),
        )
    }
}

@Composable
private fun GettingStartedSection() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TopicTitle(stringResource(R.string.help_getting_started_title))
        SectionHeading(stringResource(R.string.help_getting_started_signup_heading))
        Body(stringResource(R.string.help_getting_started_signup_body))
        SectionHeading(stringResource(R.string.help_getting_started_loop_heading))
        Body(stringResource(R.string.help_getting_started_loop_body))
        SectionHeading(stringResource(R.string.help_getting_started_map_heading))
        Bullet(stringResource(R.string.help_getting_started_map_decks))
        Bullet(stringResource(R.string.help_getting_started_map_library))
        Bullet(stringResource(R.string.help_getting_started_map_settings))
    }
}

@Composable
private fun WritingDecksSection() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TopicTitle(stringResource(R.string.help_writing_decks_title))
        SectionHeading(stringResource(R.string.help_writing_ways_heading))
        Bullet(stringResource(R.string.help_writing_ways_app))
        Bullet(stringResource(R.string.help_writing_ways_web))
        Bullet(stringResource(R.string.help_writing_ways_ai))
        SectionHeading(stringResource(R.string.help_writing_format_heading))
        Body(stringResource(R.string.help_writing_format_intro))
        Bullet(stringResource(R.string.help_writing_format_bold))
        Bullet(stringResource(R.string.help_writing_format_qa))
        Bullet(stringResource(R.string.help_writing_format_paragraphs))
        Text(
            stringResource(R.string.help_writing_format_example_caption),
            style = MaterialTheme.typography.labelLarge,
        )
        CodeBlock(stringResource(R.string.help_writing_format_example))
    }
}

@Composable
private fun BranchingSection(onOpenBranchingHelp: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TopicTitle(stringResource(R.string.help_branching_title))
        Body(stringResource(R.string.help_branching_body))
        TextButton(onClick = onOpenBranchingHelp) {
            Text(stringResource(R.string.help_branching_link))
        }
    }
}

@Composable
private fun AiSection() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TopicTitle(stringResource(R.string.help_ai_title))
        Body(stringResource(R.string.help_ai_body))
        Bullet(stringResource(R.string.help_ai_step1))
        Bullet(stringResource(R.string.help_ai_step2))
        Bullet(stringResource(R.string.help_ai_step3))
    }
}

@Composable
private fun SharingSection() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TopicTitle(stringResource(R.string.help_sharing_title))
        SectionHeading(stringResource(R.string.help_sharing_public_heading))
        Body(stringResource(R.string.help_sharing_public_body))
        SectionHeading(stringResource(R.string.help_sharing_library_heading))
        Body(stringResource(R.string.help_sharing_library_body))
    }
}
