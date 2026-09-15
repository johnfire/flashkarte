package com.flashmd.ui

import com.flashmd.data.remote.dto.CourseDeckDto
import com.flashmd.data.remote.dto.CourseDetailDto
import com.flashmd.data.repository.CourseRepository
import com.flashmd.data.repository.DeckRepository
import com.flashmd.ui.screens.courses.CourseDetailViewModel
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
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
class CourseDetailViewModelTest {
    private val repo = mockk<CourseRepository>()
    private val deckRepo = mockk<DeckRepository>()

    private fun deckRow(id: String, position: Int, locked: Boolean, mastered: Boolean = !locked) =
        CourseDeckDto(id, position, "Deck $id", 2, if (mastered) 2 else 1, mastered, locked)

    private fun course(decks: List<CourseDeckDto>, isPublic: Boolean = false) =
        CourseDetailDto("c1", "u1", "Circuits", null, isPublic, "x", "x", decks)

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        coEvery { deckRepo.getAllDecksFlow() } returns flowOf(emptyList())
    }
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadsCourseWithGatedDecks() = runTest {
        coEvery { repo.get("c1") } returns course(
            listOf(deckRow("d1", 0, locked = false), deckRow("d2", 1, locked = true)),
        )
        val vm = CourseDetailViewModel(repo, deckRepo)
        vm.load("c1")
        advanceUntilIdle()

        assertEquals(2, vm.state.value.course?.decks?.size)
        assertEquals(false, vm.state.value.course?.decks?.get(0)?.locked)
        assertEquals(true, vm.state.value.course?.decks?.get(1)?.locked)
    }

    @Test fun addingADeckReloadsTheCourse() = runTest {
        coEvery { repo.get("c1") } returnsMany listOf(
            course(listOf(deckRow("d1", 0, locked = false))),
            course(listOf(deckRow("d1", 0, locked = false), deckRow("d2", 1, locked = true))),
        )
        coEvery { repo.addDeck("c1", "d2") } returns Unit
        val vm = CourseDetailViewModel(repo, deckRepo)
        vm.load("c1")
        advanceUntilIdle()

        vm.addDeck("c1", "d2")
        advanceUntilIdle()

        assertEquals(2, vm.state.value.course?.decks?.size)
    }

    @Test fun addingADeckThatFailsReportsAnAddError() = runTest {
        coEvery { repo.get("c1") } returns course(listOf(deckRow("d1", 0, locked = false)))
        coEvery { repo.addDeck("c1", "d2") } throws IllegalStateException("bad")
        val vm = CourseDetailViewModel(repo, deckRepo)
        vm.load("c1")
        advanceUntilIdle()

        vm.addDeck("c1", "d2")
        advanceUntilIdle()

        assertEquals("Couldn't add that deck.", vm.state.value.addError)
    }

    @Test fun removingADeckDropsItLocally() = runTest {
        coEvery { repo.get("c1") } returns course(
            listOf(deckRow("d1", 0, locked = false), deckRow("d2", 1, locked = true)),
        )
        coEvery { repo.removeDeck("c1", "d2") } returns Unit
        val vm = CourseDetailViewModel(repo, deckRepo)
        vm.load("c1")
        advanceUntilIdle()

        vm.removeDeck("c1", "d2")
        advanceUntilIdle()

        assertEquals(1, vm.state.value.course?.decks?.size)
    }

    @Test fun togglePublicIsOptimisticAndRevertsOnFailure() = runTest {
        coEvery { repo.get("c1") } returns course(listOf(deckRow("d1", 0, locked = false)), isPublic = false)
        coEvery { repo.setPublic("c1", true) } throws IllegalStateException("bad")
        val vm = CourseDetailViewModel(repo, deckRepo)
        vm.load("c1")
        advanceUntilIdle()

        vm.togglePublic()
        assertEquals(true, vm.state.value.course?.isPublic) // optimistic, before the failure lands
        advanceUntilIdle()
        assertEquals(false, vm.state.value.course?.isPublic) // reverted
        assertEquals("Couldn't update sharing.", vm.state.value.error)
    }

    @Test fun deleteMarksTheCourseDeleted() = runTest {
        coEvery { repo.get("c1") } returns course(listOf(deckRow("d1", 0, locked = false)))
        coEvery { repo.delete("c1") } returns Unit
        val vm = CourseDetailViewModel(repo, deckRepo)
        vm.load("c1")
        advanceUntilIdle()

        vm.delete()
        advanceUntilIdle()

        assertTrue(vm.state.value.deleted)
    }
}
