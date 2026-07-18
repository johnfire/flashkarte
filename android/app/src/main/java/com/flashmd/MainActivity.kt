package com.flashmd

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.data.local.ThemeMode
import com.flashmd.ui.auth.AuthScreen
import com.flashmd.ui.auth.SessionViewModel
import com.flashmd.ui.navigation.NavGraph
import com.flashmd.ui.theme.FlashMdTheme
import com.flashmd.ui.theme.ThemeViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val themeVm: ThemeViewModel = hiltViewModel()
            val themeMode by themeVm.mode.collectAsStateWithLifecycle()
            val dark = when (themeMode) {
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
            }
            FlashMdTheme(darkTheme = dark) {
                val session: SessionViewModel = hiltViewModel()
                val loggedIn by session.isLoggedIn.collectAsStateWithLifecycle()
                val logoutError by session.logoutError.collectAsStateWithLifecycle()

                when (loggedIn) {
                    null -> Surface(Modifier.fillMaxSize()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                    false -> AuthScreen()
                    true -> Box(Modifier.fillMaxSize()) {
                        NavGraph(onLogout = { session.logout() })
                        if (logoutError != null) {
                            Snackbar(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(16.dp),
                            ) {
                                Text(logoutError!!)
                            }
                        }
                    }
                }
            }
        }
    }
}
