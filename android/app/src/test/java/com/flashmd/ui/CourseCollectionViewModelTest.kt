package com.flashmd.ui

import androidx.lifecycle.SavedStateHandle
import com.flashmd.data.remote.dto.CourseCollectionDetailDto
import com.flashmd.data.remote.dto.CourseCollectionDto
import com.flashmd.data.remote.dto.CourseCollectionSource
import com.flashmd.data.remote.dto.LearnSubjectDto
import com.flashmd.data.repository.CourseCollectionRepository
import com.flashmd.ui.screens.learn.CourseCollectionCatalogViewModel
import com.flashmd.ui.screens.learn.CourseCollectionDetailViewModel
import com.flashmd.ui.screens.learn.groupPersonalCourses
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CourseCollectionViewModelTest {
    private val repository = mockk<CourseCollectionRepository>()

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun catalogLoadsOfficialCollectionsOnStart() = runTest {
        coEvery { repository.list(CourseCollectionSource.OFFICIAL) } returns listOf(collection())
        coEvery { repository.listUngrouped(CourseCollectionSource.OFFICIAL) } returns emptyList()
        val viewModel = CourseCollectionCatalogViewModel(repository)

        advanceUntilIdle()

        assertEquals("AI", viewModel.state.value.collections.single().title)
        assertTrue(!viewModel.state.value.isLoading)
    }

    @Test fun catalogRetainsUngroupedCoursesWhenCollectionLoadFails() = runTest {
        coEvery { repository.list(CourseCollectionSource.OFFICIAL) } returns emptyList()
        coEvery { repository.listUngrouped(CourseCollectionSource.OFFICIAL) } returns emptyList()
        coEvery { repository.list(CourseCollectionSource.COMMUNITY) } throws IllegalStateException("offline")
        coEvery { repository.listUngrouped(CourseCollectionSource.COMMUNITY) } returns listOf(subject("s1"))
        val viewModel = CourseCollectionCatalogViewModel(repository)
        advanceUntilIdle()

        viewModel.selectSource(CourseCollectionSource.COMMUNITY)
        advanceUntilIdle()

        assertEquals(CourseCollectionSource.COMMUNITY, viewModel.state.value.source)
        assertEquals("s1", viewModel.state.value.ungroupedCourses.single().id)
        assertEquals("Part of the course catalog could not be loaded.", viewModel.state.value.error)
    }

    @Test fun detailMarksCourseAsAddedAfterEnrollment() = runTest {
        val subject = subject("s1")
        coEvery { repository.get("ai", CourseCollectionSource.OFFICIAL) } returns detail(subject)
        coEvery { repository.enroll("s1") } returns Unit
        val viewModel = CourseCollectionDetailViewModel(
            repository,
            SavedStateHandle(mapOf("collectionId" to "ai", "source" to "official")),
        )
        advanceUntilIdle()

        viewModel.enroll("s1")
        advanceUntilIdle()

        assertTrue("s1" in viewModel.state.value.enrolledSubjectIds)
        coVerify(exactly = 1) { repository.enroll("s1") }
    }

    @Test fun groupsPersonalCoursesByCollectionAndKeepsTheirPosition() {
        val courses = listOf(
            subject("s2", collectionId = "ai", position = 2),
            subject("s3", collectionId = null),
            subject("s1", collectionId = "ai", position = 1),
        )

        val collections = groupPersonalCourses(courses)

        assertEquals(1, collections.size)
        assertEquals(listOf("s1", "s2"), collections.single().courses.map { it.id })
    }

    private fun collection() = CourseCollectionDto("ai", "AI", null, true, 2)

    private fun detail(subject: LearnSubjectDto) =
        CourseCollectionDetailDto("ai", "AI", null, true, listOf(subject))

    private fun subject(
        id: String,
        collectionId: String? = "ai",
        position: Int? = 1,
    ) = LearnSubjectDto(
        id = id,
        title = "Course $id",
        courseCollectionId = collectionId,
        courseCollectionPosition = position,
        courseCollectionTitle = if (collectionId == null) null else "AI",
    )
}
