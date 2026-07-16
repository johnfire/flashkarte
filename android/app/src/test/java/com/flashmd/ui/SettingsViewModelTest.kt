package com.flashmd.ui

import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.UserDto
import com.flashmd.data.repository.AuthRepository
import com.flashmd.ui.screens.settings.SettingsViewModel
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
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelTest {
    private val auth = mockk<AuthRepository>(relaxed = true)

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadsProfileAndSaves() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, "Ada")
        coEvery { auth.updateProfile(any()) } returns UserDto("u1", "a@b.c", "user", "free", null, "Bob")
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()
        assertEquals("Ada", vm.state.value.displayNameDraft)

        vm.onDisplayNameChange("Bob")
        vm.saveDisplayName(); advanceUntilIdle()
        assertEquals("Bob", vm.state.value.user?.displayName)
        assertEquals("Saved", vm.state.value.message)
        coVerify { auth.updateProfile("Bob") }
    }

    @Test fun sendResetEmailUsesAccountEmail() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()
        vm.sendResetEmail(); advanceUntilIdle()
        coVerify { auth.forgotPassword("a@b.c") }
    }

    @Test fun changePasswordSubmitsCurrentAndNew() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        vm.onCurrentPasswordChange("OldPassw0rd")
        vm.onNewPasswordChange("BrandNewPassw0rd")
        vm.onConfirmPasswordChange("BrandNewPassw0rd")
        vm.submitPasswordChange(); advanceUntilIdle()

        coVerify { auth.changePassword("OldPassw0rd", "BrandNewPassw0rd") }
        // Fields cleared and a confirmation shown on success.
        assertEquals("", vm.state.value.newPassword)
        assertEquals(true, vm.state.value.message?.startsWith("Password updated"))
    }

    @Test fun changePasswordRejectsMismatch() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        vm.onCurrentPasswordChange("OldPassw0rd")
        vm.onNewPasswordChange("BrandNewPassw0rd")
        vm.onConfirmPasswordChange("Different0ne")
        vm.submitPasswordChange(); advanceUntilIdle()

        coVerify(exactly = 0) { auth.changePassword(any(), any()) }
        assertEquals("The new passwords don't match.", vm.state.value.error)
    }

    @Test fun exportHandsJsonToWriterAndConfirms() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        coEvery { auth.exportAccountData() } returns """{"profile":{}}"""
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        var written: String? = null
        vm.exportAccountData { written = it }; advanceUntilIdle()

        assertEquals("""{"profile":{}}""", written)
        assertEquals("Data exported", vm.state.value.message)
        assertEquals(false, vm.state.value.isExporting)
    }

    @Test fun exportSurfacesWriteFailure() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        coEvery { auth.exportAccountData() } returns "{}"
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        vm.exportAccountData { throw java.io.IOException("disk full") }
        advanceUntilIdle()

        assertEquals("Couldn't save the export file.", vm.state.value.error)
        assertEquals(false, vm.state.value.isExporting)
    }

    @Test fun deleteAccountRequiresTypedConfirmation() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        vm.openDeleteDialog()
        vm.onDeletePasswordChange("MyPassw0rd")
        vm.onDeleteConfirmTextChange("delete") // wrong case — must not pass
        vm.deleteAccount(); advanceUntilIdle()

        coVerify(exactly = 0) { auth.deleteAccount(any()) }
        assertEquals("Type DELETE to confirm.", vm.state.value.deleteError)
    }

    @Test fun deleteAccountCallsRepositoryWithPassword() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        coEvery { auth.deleteAccount(any()) } returns Unit
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        vm.openDeleteDialog()
        vm.onDeletePasswordChange("MyPassw0rd")
        vm.onDeleteConfirmTextChange("DELETE")
        vm.deleteAccount(); advanceUntilIdle()

        coVerify { auth.deleteAccount("MyPassw0rd") }
        assertEquals(null, vm.state.value.deleteError)
    }

    @Test fun deleteAccountSurfacesWrongPasswordError() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        coEvery { auth.deleteAccount(any()) } throws
            ApiException(status = 422, code = "VALIDATION", message = "Current password is incorrect")
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()

        vm.openDeleteDialog()
        vm.onDeletePasswordChange("WrongPassw0rd")
        vm.onDeleteConfirmTextChange("DELETE")
        vm.deleteAccount(); advanceUntilIdle()

        assertEquals("Current password is incorrect", vm.state.value.deleteError)
        assertEquals(false, vm.state.value.isDeletingAccount)
        // Dialog stays open so the user can retry.
        assertEquals(true, vm.state.value.showDeleteDialog)
    }
}
