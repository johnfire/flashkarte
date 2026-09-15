package com.flashmd.ui

import com.flashmd.data.remote.dto.CourseSummaryDto
import com.flashmd.data.repository.CourseRepository
import com.flashmd.ui.screens.courses.CoursesViewModel
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
class CoursesViewModelTest {
    private val repo = mockk<CourseRepository>()

    private fun course(id: String, title: String, total: Int = 0, mastered: Int = 0) =
        CourseSummaryDto(id, "u1", title, null, false, "x", "x", total, mastered)

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadsCoursesOnInit() = runTest {
        coEvery { repo.list() } returns listOf(course("c1", "Circuits", 3, 1))
        val vm = CoursesViewModel(repo)
        advanceUntilIdle()
        assertEquals(1, vm.state.value.courses.size)
        assertEquals("Circuits", vm.state.value.courses[0].title)
        assertEquals(false, vm.state.value.isLoading)
    }

    @Test fun unexpectedLoadFailureShowsErrorAndStopsLoading() = runTest {
        coEvery { repo.list() } throws IllegalStateException("bad payload")
        val vm = CoursesViewModel(repo)
        advanceUntilIdle()
        assertEquals("Couldn't load courses.", vm.state.value.error)
        assertEquals(false, vm.state.value.isLoading)
    }

    @Test fun createsAndPrependsTheNewCourse() = runTest {
        coEvery { repo.list() } returns emptyList()
        coEvery { repo.create("New Skill", null) } returns course("c2", "New Skill")
        val vm = CoursesViewModel(repo)
        advanceUntilIdle()

        vm.create("New Skill")
        advanceUntilIdle()

        assertEquals(1, vm.state.value.courses.size)
        assertEquals("New Skill", vm.state.value.courses[0].title)
    }

    @Test fun blankTitleIsIgnored() = runTest {
        coEvery { repo.list() } returns emptyList()
        val vm = CoursesViewModel(repo)
        advanceUntilIdle()

        vm.create("   ")
        advanceUntilIdle()

        coVerify(exactly = 0) { repo.create(any(), any()) }
    }

    @Test fun deletesACourse() = runTest {
        coEvery { repo.list() } returns listOf(course("c1", "Circuits"))
        coEvery { repo.delete("c1") } returns Unit
        val vm = CoursesViewModel(repo)
        advanceUntilIdle()

        vm.delete("c1")
        advanceUntilIdle()

        assertTrue(vm.state.value.courses.isEmpty())
    }
}
