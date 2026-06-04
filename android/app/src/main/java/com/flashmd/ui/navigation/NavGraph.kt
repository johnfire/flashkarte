package com.flashmd.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.flashmd.ui.screens.decklist.DeckListScreen
import com.flashmd.ui.screens.stats.StatsScreen
import com.flashmd.ui.screens.study.StudyScreen
import com.flashmd.ui.screens.summary.SessionSummaryScreen

@Composable
fun NavGraph() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "decks") {

        composable("decks") {
            DeckListScreen(
                onStudyDeck = { deckId -> navController.navigate("study/$deckId") },
                onStatsDeck = { deckId -> navController.navigate("stats/$deckId") },
            )
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
            StatsScreen(
                deckId = deckId,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
