package com.flashmd.ui.screens.help

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.flashmd.R

@Composable
internal fun StudyingSection() {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TopicTitle(stringResource(R.string.help_studying_title))
        SectionHeading(stringResource(R.string.help_studying_srs_heading))
        Body(stringResource(R.string.help_studying_srs_body))
        SectionHeading(stringResource(R.string.help_studying_ratings_heading))
        Body(stringResource(R.string.help_studying_ratings_intro))
        Bullet(stringResource(R.string.help_studying_rating_again))
        Bullet(stringResource(R.string.help_studying_rating_hard))
        Bullet(stringResource(R.string.help_studying_rating_good))
        Bullet(stringResource(R.string.help_studying_rating_easy))
        Bullet(stringResource(R.string.help_studying_rating_perfect))
        SectionHeading(stringResource(R.string.help_studying_choice_heading))
        Body(stringResource(R.string.help_studying_choice_body))
    }
}
