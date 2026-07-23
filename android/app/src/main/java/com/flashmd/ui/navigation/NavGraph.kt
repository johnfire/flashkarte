package com.flashmd.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.flashmd.ui.screens.createdeck.CreateDeckScreen
import com.flashmd.ui.screens.decklist.DeckListScreen
import com.flashmd.ui.screens.help.BranchingHelpScreen
import com.flashmd.ui.screens.help.HelpScreen
import com.flashmd.ui.screens.library.LibraryDetailScreen
import com.flashmd.ui.screens.library.LibraryScreen
import com.flashmd.ui.screens.play.BranchPlayScreen
import com.flashmd.ui.screens.reportbug.ReportBugScreen
import com.flashmd.ui.screens.settings.SettingsScreen
import com.flashmd.ui.screens.stats.StatsScreen
import com.flashmd.ui.screens.study.StudyScreen
import com.flashmd.ui.screens.summary.SessionSummaryScreen

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("decks", "Decks", Icons.Filled.Home),
    Tab("library", "Library", Icons.Filled.Search),
    Tab("settings", "Settings", Icons.Filled.Settings),
)

@Composable
fun NavGraph(onLogout: () -> Unit = {}) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route
    val showBar = currentRoute in tabs.map { it.route }

    Scaffold(
        bottomBar = {
            if (showBar) {
                NavigationBar {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                if (currentRoute != tab.route) {
                                    navController.navigate(tab.route) {
                                        popUpTo("decks") { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "decks",
            modifier = Modifier.padding(padding),
        ) {
            composable("decks") {
                DeckListScreen(
                    onStudyDeck = { deckId -> navController.navigate("study/$deckId") },
                    onPlayDeck = { deckId -> navController.navigate("play/$deckId") },
                    onStatsDeck = { deckId -> navController.navigate("stats/$deckId") },
                    onCreateDeck = { navController.navigate("decks/new") },
                    onHelp = { navController.navigate("help") },
                )
            }

            composable("decks/new") {
                CreateDeckScreen(
                    onDone = { navController.popBackStack() },
                    onHowTo = { navController.navigate("branching-help") },
                )
            }

            composable("branching-help") {
                BranchingHelpScreen(onBack = { navController.popBackStack() })
            }

            composable("help") {
                HelpScreen(
                    onBack = { navController.popBackStack() },
                    onOpenBranchingHelp = { navController.navigate("branching-help") },
                )
            }

            composable(
                route = "play/{deckId}",
                arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
            ) {
                BranchPlayScreen(onBack = { navController.popBackStack() })
            }

            composable("library") {
                LibraryScreen(onOpenDeck = { id -> navController.navigate("library/$id") })
            }

            composable(
                route = "library/{deckId}",
                arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
            ) { entry ->
                LibraryDetailScreen(
                    deckId = entry.arguments!!.getString("deckId")!!,
                    onBack = { navController.popBackStack() },
                    onCloned = { newId ->
                        navController.navigate("study/$newId") { popUpTo("decks") }
                    },
                )
            }

            composable("settings") {
                SettingsScreen(
                    onLogout = onLogout,
                    onReportBug = { navController.navigate("report-bug") },
                    onHelp = { navController.navigate("help") },
                )
            }

            composable("report-bug") {
                ReportBugScreen(onBack = { navController.popBackStack() })
            }

            composable(
                route = "study/{deckId}",
                arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
            ) { backStack ->
                val deckId = backStack.arguments!!.getString("deckId")!!
                StudyScreen(
                    deckId = deckId,
                    onBack = { navController.popBackStack() },
                    onSessionDone = { reviewed, c1, c2, c3, c4, c5 ->
                        navController.navigate("summary/$deckId/$reviewed/$c1/$c2/$c3/$c4/$c5") {
                            popUpTo("decks")
                        }
                    },
                )
            }

            composable(
                route = "summary/{deckId}/{reviewed}/{c1}/{c2}/{c3}/{c4}/{c5}",
                arguments = listOf(
                    navArgument("deckId") { type = NavType.StringType },
                    navArgument("reviewed") { type = NavType.IntType },
                    navArgument("c1") { type = NavType.IntType },
                    navArgument("c2") { type = NavType.IntType },
                    navArgument("c3") { type = NavType.IntType },
                    navArgument("c4") { type = NavType.IntType },
                    navArgument("c5") { type = NavType.IntType },
                ),
            ) { backStack ->
                val args = backStack.arguments!!
                SessionSummaryScreen(
                    deckId = args.getString("deckId")!!,
                    reviewed = args.getInt("reviewed"),
                    ratingCounts = mapOf(
                        1 to args.getInt("c1"),
                        2 to args.getInt("c2"),
                        3 to args.getInt("c3"),
                        4 to args.getInt("c4"),
                        5 to args.getInt("c5"),
                    ),
                    onBack = { navController.navigate("decks") { popUpTo("decks") { inclusive = true } } },
                    onStats = { deckId -> navController.navigate("stats/$deckId") },
                )
            }

            composable(
                route = "stats/{deckId}",
                arguments = listOf(navArgument("deckId") { type = NavType.StringType }),
            ) { backStack ->
                val deckId = backStack.arguments!!.getString("deckId")!!
                StatsScreen(deckId = deckId, onBack = { navController.popBackStack() })
            }
        }
    }
}
