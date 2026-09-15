package com.flashmd.ui

import com.flashmd.data.remote.dto.CloneCourseResponse
import com.flashmd.data.remote.dto.CourseDto
import com.flashmd.data.remote.dto.PublicCourseSummaryDto
import com.flashmd.data.repository.CourseRepository
import com.flashmd.ui.screens.courses.PublicCoursesViewModel
import io.mockk.coEvery
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
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PublicCoursesViewModelTest {
    private val repo = mockk<CourseRepository>()

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadsPublicCourses() = runTest {
        coEvery { repo.listPublic() } returns listOf(
            PublicCourseSummaryDto("c1", "Intro to Circuits", "The basics", 4),
        )
        val vm = PublicCoursesViewModel(repo)
        advanceUntilIdle()
        assertEquals(1, vm.state.value.courses.size)
    }

    @Test fun cloneThenNavigatesViaClonedCourseId() = runTest {
        coEvery { repo.listPublic() } returns emptyList()
        coEvery { repo.clone("c1") } returns CloneCourseResponse(
            course = CourseDto("new-c1", "u2", "Intro to Circuits", null, false, "x", "x"),
            decksCloned = 4,
            sourceId = "c1",
        )
        val vm = PublicCoursesViewModel(repo)
        advanceUntilIdle()

        vm.clone("c1")
        advanceUntilIdle()

        assertEquals("new-c1", vm.state.value.clonedCourseId)
        assertEquals(null, vm.state.value.cloningId)
    }

    @Test fun unexpectedCloneFailureShowsErrorAndStopsCloning() = runTest {
        coEvery { repo.listPublic() } returns emptyList()
        coEvery { repo.clone("c1") } throws IllegalStateException("bad payload")
        val vm = PublicCoursesViewModel(repo)
        advanceUntilIdle()

        vm.clone("c1")
        advanceUntilIdle()

        assertEquals("Couldn't clone that course.", vm.state.value.error)
        assertEquals(null, vm.state.value.cloningId)
    }
}
