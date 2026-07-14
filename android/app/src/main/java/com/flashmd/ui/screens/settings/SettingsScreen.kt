package com.flashmd.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.input.ImeAction
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.data.local.ThemeMode
import com.flashmd.ui.components.PasswordField
import com.flashmd.ui.theme.ThemeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onLogout: () -> Unit,
    onReportBug: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel(),
    themeViewModel: ThemeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val themeMode by themeViewModel.mode.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings", fontWeight = FontWeight.Bold) }) },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Profile", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = state.displayNameDraft,
                onValueChange = viewModel::onDisplayNameChange,
                label = { Text("Display name") },
                supportingText = { Text("Shown as the author on decks you publish.") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(onClick = { viewModel.saveDisplayName() }, enabled = !state.isSaving) {
                Text(if (state.isSaving) "Saving…" else "Save")
            }

            HorizontalDivider()
            Text("Account", style = MaterialTheme.typography.titleMedium)
            Text("Email: ${state.user?.email ?: "—"}")
            Text("Plan: ${state.user?.accountType ?: "—"}")
            val verified = state.user?.emailVerifiedAt != null
            Text("Email verified: ${if (verified) "Yes" else "No"}")
            if (!verified && state.user != null) {
                OutlinedButton(onClick = { viewModel.resendVerification() }) { Text("Resend verification email") }
            }

            HorizontalDivider()
            Text("Appearance", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ThemeMode.entries.forEach { mode ->
                    FilterChip(
                        selected = themeMode == mode,
                        onClick = { themeViewModel.set(mode) },
                        label = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) },
                    )
                }
            }

            HorizontalDivider()
            Text("Change password", style = MaterialTheme.typography.titleMedium)
            PasswordField(
                value = state.currentPassword,
                onValueChange = viewModel::onCurrentPasswordChange,
                label = "Current password",
                imeAction = ImeAction.Next,
                modifier = Modifier.fillMaxWidth(),
            )
            PasswordField(
                value = state.newPassword,
                onValueChange = viewModel::onNewPasswordChange,
                label = "New password (min 8 chars)",
                imeAction = ImeAction.Next,
                modifier = Modifier.fillMaxWidth(),
            )
            PasswordField(
                value = state.confirmPassword,
                onValueChange = viewModel::onConfirmPasswordChange,
                label = "Confirm new password",
                imeAction = ImeAction.Done,
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = { viewModel.submitPasswordChange() },
                enabled = !state.isChangingPassword &&
                    state.currentPassword.isNotEmpty() &&
                    state.newPassword.isNotEmpty() &&
                    state.confirmPassword.isNotEmpty(),
            ) {
                Text(if (state.isChangingPassword) "Updating…" else "Update password")
            }
            Text(
                "Can't remember your current password?",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedButton(onClick = { viewModel.sendResetEmail() }) {
                Text("Email me a reset link")
            }

            HorizontalDivider()
            Text("Feedback", style = MaterialTheme.typography.titleMedium)
            OutlinedButton(onClick = onReportBug) { Text("Report a bug") }

            HorizontalDivider()
            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Log out") }

            if (state.message != null) Text(state.message!!, color = MaterialTheme.colorScheme.primary)
            if (state.error != null) Text(state.error!!, color = MaterialTheme.colorScheme.error)
        }
    }
}
