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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.R
import com.flashmd.data.remote.dto.CourseCollectionSource
import com.flashmd.data.remote.dto.LearnSubjectDto
import com.flashmd.ui.components.RefreshOnResume

internal data class PersonalCourseCollection(
    val id: String,
    val title: String,
    val courses: List<LearnSubjectDto>,
)

internal fun groupPersonalCourses(subjects: List<LearnSubjectDto>): List<PersonalCourseCollection> =
    subjects
        .filter { it.courseCollectionId != null }
        .groupBy { checkNotNull(it.courseCollectionId) }
        .map { (collectionId, collectionCourses) ->
            PersonalCourseCollection(
                id = collectionId,
                title = collectionCourses.first().courseCollectionTitle ?: "",
                courses = collectionCourses.sortedBy { it.courseCollectionPosition ?: Int.MAX_VALUE },
            )
        }
        .sortedBy { it.title }

@Composable
internal fun PersonalCoursesContent(
    subjects: List<LearnSubjectDto>,
    onOpenCollection: (String) -> Unit,
    onOpenSubject: (String) -> Unit,
) {
    val collections = groupPersonalCourses(subjects)
    val ungroupedCourses = subjects.filter { it.courseCollectionId == null }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (collections.isNotEmpty()) {
            item { Text(stringResource(R.string.learn_course_collections), style = MaterialTheme.typography.titleLarge) }
            items(collections, key = { it.id }) { collection ->
                CollectionCard(collection, onOpenCollection)
            }
        }
        if (ungroupedCourses.isNotEmpty()) {
            if (collections.isNotEmpty()) {
                item { Text(stringResource(R.string.learn_other_courses), style = MaterialTheme.typography.titleLarge) }
            }
            items(ungroupedCourses, key = { it.id }) { course ->
                PersonalCourseCard(course, onOpenSubject)
            }
        }
    }
}

@Composable
private fun CollectionCard(
    collection: PersonalCourseCollection,
    onOpenCollection: (String) -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable { onOpenCollection(collection.id) },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(collection.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                pluralStringResource(R.plurals.learn_course_count, collection.courses.size, collection.courses.size),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
internal fun PersonalCourseCard(course: LearnSubjectDto, onOpenSubject: (String) -> Unit) {
    Card(
        Modifier.fillMaxWidth().clickable { onOpenSubject(course.id) },
        colors = CardDefaults.cardColors(containerColor = courseProgressColor(course.courseProgress)),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                listOfNotNull(course.title, course.referenceNumber?.let { "#$it" }).joinToString("  "),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            course.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            CourseProgressLabel(course.courseProgress)
            Text(
                pluralStringResource(R.plurals.learn_concept_count, course.conceptCount, course.conceptCount),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun courseProgressColor(progress: String?): androidx.compose.ui.graphics.Color =
    when (progress) {
        "completed" -> MaterialTheme.colorScheme.tertiaryContainer
        "in_progress" -> MaterialTheme.colorScheme.secondaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant
    }

@Composable
private fun CourseProgressLabel(progress: String?) {
    val label = when (progress) {
        "completed" -> R.string.learn_course_completed
        "in_progress" -> R.string.learn_course_in_progress
        else -> return
    }
    Text(
        stringResource(label),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyCourseCollectionScreen(
    collectionId: String,
    onBack: () -> Unit,
    onOpenSubject: (String) -> Unit,
    viewModel: LearnSubjectsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val error = state.error
    val courses = state.subjects.filter { it.courseCollectionId == collectionId }
    val title = courses.firstOrNull()?.courseCollectionTitle ?: stringResource(R.string.learn_course_collections)
    RefreshOnResume(viewModel::refresh)
    Scaffold(topBar = { LearnTopBar(title, onBack) }) { padding ->
        when {
            state.isLoading && courses.isEmpty() -> LoadingBox(Modifier.padding(padding))
            error != null && courses.isEmpty() -> ErrorBox(error, Modifier.padding(padding))
            courses.isEmpty() -> EmptyBox(R.string.learn_collection_empty, Modifier.padding(padding))
            else -> LazyColumn(
                Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(courses, key = { it.id }) { course -> PersonalCourseCard(course, onOpenSubject) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseCollectionCatalogScreen(
    onBack: () -> Unit,
    onOpenCollection: (CourseCollectionSource, String) -> Unit,
    viewModel: CourseCollectionCatalogViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    RefreshOnResume(viewModel::refresh)
    Scaffold(topBar = { LearnTopBar(stringResource(R.string.course_catalog_title), onBack) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            CourseCatalogSourceFilters(state.source, viewModel::selectSource)
            CourseCollectionCatalogBody(
                state,
                viewModel::refresh,
                onOpenCollection,
                viewModel::enroll,
                Modifier.fillMaxWidth().weight(1f),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourseCollectionCatalogBody(
    state: CourseCollectionCatalogUiState,
    onRefresh: () -> Unit,
    onOpenCollection: (CourseCollectionSource, String) -> Unit,
    onEnroll: (String) -> Unit,
    modifier: Modifier,
) {
    PullToRefreshBox(
        isRefreshing = state.isLoading,
        onRefresh = onRefresh,
        modifier = modifier,
    ) {
        val error = state.error
        when {
            state.isLoading && state.collections.isEmpty() -> LoadingBox()
            error != null && state.collections.isEmpty() && state.ungroupedCourses.isEmpty() -> ErrorBox(error)
            state.collections.isEmpty() && state.ungroupedCourses.isEmpty() -> EmptyBox(R.string.course_catalog_empty)
            else -> CourseCollectionCatalogList(state, onOpenCollection, onEnroll)
        }
    }
}

@Composable
private fun CourseCatalogSourceFilters(
    selectedSource: CourseCollectionSource,
    onSelect: (CourseCollectionSource) -> Unit,
) {
    Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CourseSourceChip(CourseCollectionSource.OFFICIAL, selectedSource, onSelect)
        CourseSourceChip(CourseCollectionSource.COMMUNITY, selectedSource, onSelect)
    }
}

@Composable
private fun CourseCollectionCatalogList(
    state: CourseCollectionCatalogUiState,
    onOpenCollection: (CourseCollectionSource, String) -> Unit,
    onEnroll: (String) -> Unit,
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        state.error?.let { message ->
            item { Text(message, color = MaterialTheme.colorScheme.error) }
        }
        items(state.collections, key = { it.id }) { collection ->
            CatalogCollectionCard(collection.title, collection.description, collection.courseCount) {
                onOpenCollection(state.source, collection.id)
            }
        }
        if (state.ungroupedCourses.isNotEmpty()) {
            item {
                Text(
                    stringResource(R.string.learn_other_courses),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            items(state.ungroupedCourses, key = { it.id }) { course ->
                CatalogCourseCard(course, state, onEnroll)
            }
        }
    }
}

@Composable
private fun CatalogCollectionCard(
    title: String,
    description: String?,
    courseCount: Int,
    onOpen: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable(onClick = onOpen),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            description?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            Text(
                pluralStringResource(R.plurals.learn_course_count, courseCount, courseCount),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun CatalogCourseCard(
    course: LearnSubjectDto,
    state: CourseCollectionCatalogUiState,
    onEnroll: (String) -> Unit,
) {
    val enrolled = course.id in state.enrolledSubjectIds
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(course.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            course.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            Button(
                onClick = { onEnroll(course.id) },
                enabled = !enrolled && state.enrollingSubjectId == null,
            ) {
                EnrollButtonLabel(enrolled, state.enrollingSubjectId == course.id)
            }
        }
    }
}

@Composable
private fun CourseSourceChip(
    source: CourseCollectionSource,
    selectedSource: CourseCollectionSource,
    onSelect: (CourseCollectionSource) -> Unit,
) {
    val label = if (source == CourseCollectionSource.OFFICIAL) {
        stringResource(R.string.course_catalog_official)
    } else {
        stringResource(R.string.course_catalog_community)
    }
    FilterChip(selected = source == selectedSource, onClick = { onSelect(source) }, label = { Text(label) })
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseCollectionDetailScreen(
    onBack: () -> Unit,
    viewModel: CourseCollectionDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val error = state.error
    Scaffold(topBar = { LearnTopBar(state.collection?.title ?: stringResource(R.string.course_catalog_title), onBack) }) { padding ->
        when {
            state.isLoading && state.collection == null -> LoadingBox(Modifier.padding(padding))
            error != null && state.collection == null -> ErrorBox(error, Modifier.padding(padding))
            state.collection != null -> CourseCollectionDetailContent(state, viewModel::enroll, Modifier.padding(padding))
        }
    }
}

@Composable
private fun CourseCollectionDetailContent(
    state: CourseCollectionDetailUiState,
    onEnroll: (String) -> Unit,
    modifier: Modifier,
) {
    val collection = checkNotNull(state.collection)
    LazyColumn(
        modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        collection.description?.let { description -> item { Text(description, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        state.error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
        if (collection.courses.isEmpty()) item { Text(stringResource(R.string.learn_collection_empty)) }
        items(collection.courses, key = { it.id }) { course ->
            val enrolled = course.id in state.enrolledSubjectIds
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(course.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    course.description?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                    Button(
                        onClick = { onEnroll(course.id) },
                        enabled = !enrolled && state.enrollingSubjectId == null,
                    ) {
                        EnrollButtonLabel(enrolled, state.enrollingSubjectId == course.id)
                    }
                }
            }
        }
    }
}

@Composable
private fun EnrollButtonLabel(enrolled: Boolean, isAdding: Boolean) {
    Text(
        when {
            enrolled -> stringResource(R.string.course_catalog_added)
            isAdding -> stringResource(R.string.course_catalog_adding)
            else -> stringResource(R.string.course_catalog_add)
        },
    )
}

@Composable
private fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
}

@Composable
private fun ErrorBox(message: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(24.dp), Alignment.Center) {
        Text(message, color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun EmptyBox(message: Int, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), Alignment.Center) {
        Text(stringResource(message), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
