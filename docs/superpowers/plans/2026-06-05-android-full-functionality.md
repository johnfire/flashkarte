# Android Full Functionality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Android app to web parity — deck management (create-from-Markdown, rename, add cards, publish/unpublish, delete), the public library (browse, search, clone), and account settings (display name, account info, resend verification, theme, change-password-via-email, logout) — behind a 3-tab bottom navigation bar.

**Architecture:** One Compose screen + one `@HiltViewModel` per feature, each backed by a `@Singleton` repository wrapping `FlashkarteApi` via the existing `apiCall { }` helper. New `@Serializable` DTOs in `data/remote/dto`. New VMs back their UI state with a single `MutableStateFlow<UiState>` (updated directly) so they're unit-testable without a collector. No server changes — every endpoint already exists.

**Tech Stack:** Kotlin/Compose, Hilt, Retrofit + kotlinx-serialization, Navigation-Compose, JUnit4 + mockk + MockWebServer + coroutines-test.

**Spec:** docs/superpowers/specs/2026-06-05-android-full-functionality-design.md

---

## File Structure

All paths under `android/app/src/main/java/com/flashmd` unless noted.

- **DTOs** — `data/remote/dto/Dtos.kt` (expand `UserDto`, add deck/auth request DTOs); `data/remote/dto/LibraryDtos.kt` (new).
- **API** — `data/remote/FlashkarteApi.kt` (add library/deck/auth methods).
- **Repositories** — `data/repository/LibraryRepository.kt` (new); `DeckRepository.kt` + `AuthRepository.kt` (extend).
- **Navigation** — `ui/navigation/NavGraph.kt` (bottom-nav scaffold + new routes).
- **Create deck** — `ui/screens/createdeck/CreateDeckScreen.kt` + `CreateDeckViewModel.kt` (new).
- **Deck actions** — `ui/screens/decklist/DeckListScreen.kt` + `DeckListViewModel.kt` (extend).
- **Library** — `ui/screens/library/LibraryScreen.kt`, `LibraryViewModel.kt`, `LibraryDetailScreen.kt`, `LibraryDetailViewModel.kt` (new).
- **Settings** — `ui/screens/settings/SettingsScreen.kt` + `SettingsViewModel.kt` (new); `ui/theme/ThemeViewModel.kt` (add `set`).
- **Tests** — `app/src/test/java/com/flashmd/remote/{LibraryApiContractTest,DeckMutationApiContractTest,AuthMeApiContractTest}.kt`; `app/src/test/java/com/flashmd/ui/{LibraryViewModelTest,LibraryDetailViewModelTest,CreateDeckViewModelTest,SettingsViewModelTest}.kt`.

---

# Phase 1 — DTOs, API, repositories

### Task 1: DTOs — expand UserDto + add request/response DTOs

**Files:**

- Modify: `data/remote/dto/Dtos.kt`
- Create: `data/remote/dto/LibraryDtos.kt`

- [ ] **Step 1: Expand `UserDto` in `Dtos.kt`**

Replace the existing `UserDto` (id/email/role) with the full profile. Extra
fields are camelCase (server's `PublicUser`) and optional so existing
login/signup parsing is unaffected:

```kotlin
@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val role: String,
    val accountType: String? = null,
    val emailVerifiedAt: String? = null,
    val displayName: String? = null,
)
```

- [ ] **Step 2: Add deck-mutation + auth DTOs to `Dtos.kt`**

Append:

```kotlin
@Serializable
data class UpdateDeckRequest(
    val title: String? = null,
    val isPublic: Boolean? = null,
)

@Serializable
data class AddCardsRequest(val markdown: String)

@Serializable
data class AddCardsResponse(
    @SerialName("deck_id") val deckId: String,
    val added: Int = 0,
)

@Serializable
data class MeResponse(val user: UserDto)

@Serializable
data class UpdateProfileRequest(val displayName: String)

@Serializable
data class ForgotPasswordRequest(val email: String)
```

- [ ] **Step 3: Add `is_public` to `DeckListItemDto` in `Dtos.kt`**

Add this field to the existing `DeckListItemDto` (deck-list rows are snake_case):

```kotlin
    @SerialName("is_public") val isPublic: Boolean = false,
```

- [ ] **Step 4: Create `LibraryDtos.kt`**

Library responses are camelCase (server `toLibraryDeck`), so property names match
without `@SerialName`:

```kotlin
package com.flashmd.data.remote.dto

import kotlinx.serialization.Serializable

@Serializable
data class LibraryDeckDto(
    val id: String,
    val title: String,
    val author: String? = null,
    val cardCount: Int = 0,
    val publishedAt: String? = null,
)

@Serializable
data class LibraryListResponse(val decks: List<LibraryDeckDto> = emptyList())

@Serializable
data class LibraryDeckDetailDto(
    val id: String,
    val title: String,
    val author: String? = null,
    val cardCount: Int = 0,
    val publishedAt: String? = null,
    val cards: List<CardContentDto> = emptyList(),
)
```

- [ ] **Step 5: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/remote/dto/Dtos.kt android/app/src/main/java/com/flashmd/data/remote/dto/LibraryDtos.kt
git commit -m "feat(android): DTOs for library, deck mutations, and full user profile"
```

---

### Task 2: API — add library/deck/auth methods

**Files:**

- Modify: `data/remote/FlashkarteApi.kt`

- [ ] **Step 1: Add imports**

Add to the import block:

```kotlin
import com.flashmd.data.remote.dto.AddCardsRequest
import com.flashmd.data.remote.dto.AddCardsResponse
import com.flashmd.data.remote.dto.DeckCreatedDto
import com.flashmd.data.remote.dto.ForgotPasswordRequest
import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.remote.dto.LibraryListResponse
import com.flashmd.data.remote.dto.MeResponse
import com.flashmd.data.remote.dto.UpdateDeckRequest
import com.flashmd.data.remote.dto.UpdateProfileRequest
import retrofit2.http.PATCH
import retrofit2.http.Query
```

(`DeckCreatedDto` may already be imported — if so, skip the duplicate.)

- [ ] **Step 2: Add the endpoint methods inside the `interface FlashkarteApi`**

```kotlin
    // Deck mutations
    @PATCH("api/decks/{id}")
    suspend fun updateDeck(@Path("id") id: String, @Body body: UpdateDeckRequest): DeckDetailDto

    @POST("api/decks/{id}/cards")
    suspend fun addCards(@Path("id") id: String, @Body body: AddCardsRequest): AddCardsResponse

    // Library
    @GET("api/library")
    suspend fun listLibrary(@Query("q") q: String?): LibraryListResponse

    @GET("api/library/{id}")
    suspend fun getLibraryDeck(@Path("id") id: String): LibraryDeckDetailDto

    @POST("api/library/{id}/clone")
    suspend fun cloneLibraryDeck(@Path("id") id: String): DeckCreatedDto

    // Account
    @GET("api/auth/me")
    suspend fun getMe(): MeResponse

    @PATCH("api/auth/me")
    suspend fun updateMe(@Body body: UpdateProfileRequest): MeResponse

    @POST("api/auth/resend-verification")
    suspend fun resendVerification(): Response<Unit>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): Response<Unit>
```

(`Response` from `retrofit2.Response` is already imported in this file.)

- [ ] **Step 3: Compile**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/remote/FlashkarteApi.kt
git commit -m "feat(android): wire library, deck-mutation, and account API endpoints"
```

---

### Task 3: LibraryRepository + contract test

**Files:**

- Create: `data/repository/LibraryRepository.kt`
- Test: `app/src/test/java/com/flashmd/remote/LibraryApiContractTest.kt`

- [ ] **Step 1: Write the failing contract test**

```kotlin
package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class LibraryApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Before fun setUp() {
        server = MockWebServer(); server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build().create(FlashkarteApi::class.java)
    }
    @After fun tearDown() = server.shutdown()

    @Test fun parsesLibraryList() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"decks":[{"id":"d1","title":"Bio","author":"Ada","cardCount":42,"publishedAt":"2026-06-01T00:00:00.000Z"}]}"""))
        val res = api.listLibrary(null)
        assertEquals(1, res.decks.size)
        assertEquals("Ada", res.decks[0].author)
        assertEquals(42, res.decks[0].cardCount)
    }

    @Test fun parsesLibraryDetailAndClone() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"d1","title":"Bio","author":"Ada","cardCount":1,"publishedAt":null,"cards":[{"front":"Q","back":"A"}]}"""))
        val detail = api.getLibraryDeck("d1")
        assertEquals(1, detail.cards.size)
        assertEquals("Q", detail.cards[0].front)

        server.enqueue(MockResponse().setBody("""{"id":"new1","title":"Bio","card_count":1}"""))
        val cloned = api.cloneLibraryDeck("d1")
        assertEquals("new1", cloned.id)
        assertEquals(1, cloned.cardCount)
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.remote.LibraryApiContractTest"`
Expected: FAIL (compile error — `LibraryRepository` not needed yet, but methods/DTOs already exist from Tasks 1–2, so this may PASS already; if it passes, that's fine — it pins the contract).

- [ ] **Step 3: Write `LibraryRepository`**

```kotlin
package com.flashmd.data.repository

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.apiCall
import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.remote.dto.LibraryDeckDto
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LibraryRepository @Inject constructor(
    private val api: FlashkarteApi,
) {
    suspend fun list(query: String?): List<LibraryDeckDto> =
        apiCall { api.listLibrary(query?.trim()?.takeIf { it.isNotEmpty() }) }.decks

    suspend fun get(id: String): LibraryDeckDetailDto =
        apiCall { api.getLibraryDeck(id) }

    /** Clones a public deck into the user's account; returns the new deck id. */
    suspend fun clone(id: String): String =
        apiCall { api.cloneLibraryDeck(id) }.id
}
```

- [ ] **Step 4: Run the test + compile**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.remote.LibraryApiContractTest" :app:compileDebugKotlin`
Expected: PASS + BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/repository/LibraryRepository.kt android/app/src/test/java/com/flashmd/remote/LibraryApiContractTest.kt
git commit -m "feat(android): LibraryRepository + contract test"
```

---

### Task 4: DeckRepository mutations + Deck.isPublic + contract test

**Files:**

- Modify: `data/repository/DeckRepository.kt`
- Modify: `domain/model/Deck.kt`
- Test: `app/src/test/java/com/flashmd/remote/DeckMutationApiContractTest.kt`

- [ ] **Step 1: Add `isPublic` to the `Deck` model**

In `domain/model/Deck.kt`, add to the data class:

```kotlin
    val isPublic: Boolean = false,
```

- [ ] **Step 2: Map `isPublic` + add mutation methods in `DeckRepository`**

In the `DeckListItemDto.toDomain()` mapper add `isPublic = isPublic,`. Add these
suspend methods to the class:

```kotlin
    suspend fun renameDeck(id: String, title: String) {
        apiCall { api.updateDeck(id, com.flashmd.data.remote.dto.UpdateDeckRequest(title = title)) }
        refresh()
    }

    suspend fun setPublic(id: String, isPublic: Boolean) {
        apiCall { api.updateDeck(id, com.flashmd.data.remote.dto.UpdateDeckRequest(isPublic = isPublic)) }
        refresh()
    }

    suspend fun addCards(id: String, markdown: String): Int {
        val res = apiCall { api.addCards(id, com.flashmd.data.remote.dto.AddCardsRequest(markdown)) }
        refresh()
        return res.added
    }
```

- [ ] **Step 3: Write the contract test**

```kotlin
package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.AddCardsRequest
import com.flashmd.data.remote.dto.UpdateDeckRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class DeckMutationApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Before fun setUp() {
        server = MockWebServer(); server.start()
        api = Retrofit.Builder().baseUrl(server.url("/")).client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build().create(FlashkarteApi::class.java)
    }
    @After fun tearDown() = server.shutdown()

    @Test fun patchDeckSendsTitleAndParsesDetail() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"id":"d1","title":"New","source_filename":null,"created_at":"x","updated_at":"y"}"""))
        val res = api.updateDeck("d1", UpdateDeckRequest(title = "New"))
        assertEquals("New", res.title)
        val req = server.takeRequest()
        assertEquals("PATCH", req.method)
        assertTrue(req.body.readUtf8().contains("\"title\":\"New\""))
    }

    @Test fun addCardsSendsMarkdownAndParsesCount() = runBlocking {
        server.enqueue(MockResponse().setBody("""{"deck_id":"d1","added":3}"""))
        val res = api.addCards("d1", AddCardsRequest("Q: a\nA: b"))
        assertEquals(3, res.added)
        assertEquals("d1", res.deckId)
        val req = server.takeRequest()
        assertTrue(req.body.readUtf8().contains("markdown"))
    }
}
```

- [ ] **Step 4: Run test + compile**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.remote.DeckMutationApiContractTest" :app:compileDebugKotlin`
Expected: PASS + BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/repository/DeckRepository.kt android/app/src/main/java/com/flashmd/domain/model/Deck.kt android/app/src/test/java/com/flashmd/remote/DeckMutationApiContractTest.kt
git commit -m "feat(android): deck rename/add-cards/publish + isPublic + contract test"
```

---

### Task 5: AuthRepository account methods + contract test

**Files:**

- Modify: `data/repository/AuthRepository.kt`
- Test: `app/src/test/java/com/flashmd/remote/AuthMeApiContractTest.kt`

- [ ] **Step 1: Add account methods to `AuthRepository`**

Add imports `com.flashmd.data.remote.dto.UpdateProfileRequest`,
`com.flashmd.data.remote.dto.ForgotPasswordRequest`,
`com.flashmd.data.remote.dto.UserDto`, then add:

```kotlin
    suspend fun getMe(): UserDto = apiCall { api.getMe() }.user

    suspend fun updateProfile(displayName: String): UserDto =
        apiCall { api.updateMe(UpdateProfileRequest(displayName.trim())) }.user

    suspend fun resendVerification() {
        apiCall { api.resendVerification() }
    }

    suspend fun forgotPassword(email: String) {
        apiCall { api.forgotPassword(ForgotPasswordRequest(email.trim())) }
    }
```

- [ ] **Step 2: Write the contract test**

```kotlin
package com.flashmd.remote

import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.UpdateProfileRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class AuthMeApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: FlashkarteApi
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    @Before fun setUp() {
        server = MockWebServer(); server.start()
        api = Retrofit.Builder().baseUrl(server.url("/")).client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build().create(FlashkarteApi::class.java)
    }
    @After fun tearDown() = server.shutdown()

    @Test fun parsesMeProfile() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"user":{"id":"u1","email":"a@b.c","role":"user","accountType":"free","emailVerifiedAt":null,"displayName":"Ada"}}"""))
        val res = api.getMe()
        assertEquals("free", res.user.accountType)
        assertEquals("Ada", res.user.displayName)
        assertEquals(null, res.user.emailVerifiedAt)
    }

    @Test fun updateMeSendsDisplayName() = runBlocking {
        server.enqueue(MockResponse().setBody(
            """{"user":{"id":"u1","email":"a@b.c","role":"user","accountType":"free","emailVerifiedAt":null,"displayName":"Bob"}}"""))
        val res = api.updateMe(UpdateProfileRequest("Bob"))
        assertEquals("Bob", res.user.displayName)
        val req = server.takeRequest()
        assertEquals("PATCH", req.method)
        assertTrue(req.body.readUtf8().contains("\"displayName\":\"Bob\""))
    }
}
```

- [ ] **Step 3: Run test + compile**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.remote.AuthMeApiContractTest" :app:compileDebugKotlin`
Expected: PASS + BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/data/repository/AuthRepository.kt android/app/src/test/java/com/flashmd/remote/AuthMeApiContractTest.kt
git commit -m "feat(android): AuthRepository account methods + contract test"
```

---

# Phase 2 — Navigation

### Task 6: Bottom-nav scaffold + new routes

**Files:**

- Modify: `ui/navigation/NavGraph.kt`

- [ ] **Step 1: Rewrite `NavGraph.kt` with a bottom bar + new routes**

The bottom bar shows on the three tab routes only; pushed routes (study, stats,
summary, library detail, create) hide it.

```kotlin
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
import com.flashmd.ui.screens.library.LibraryDetailScreen
import com.flashmd.ui.screens.library.LibraryScreen
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
                    onStatsDeck = { deckId -> navController.navigate("stats/$deckId") },
                    onCreateDeck = { navController.navigate("decks/new") },
                )
            }

            composable("decks/new") {
                CreateDeckScreen(onDone = { navController.popBackStack() })
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
                SettingsScreen(onLogout = onLogout)
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
```

> This references `DeckListScreen(onCreateDeck=…)` (no more `onLogout`),
> `CreateDeckScreen`, `LibraryScreen`, `LibraryDetailScreen`, `SettingsScreen` —
> all created in later tasks. It will NOT compile until Tasks 7–15 land, so this
> task's verification is deferred: commit now, compile at the end of Phase 5.

- [ ] **Step 2: Commit (compiles after Phase 5)**

```bash
git add android/app/src/main/java/com/flashmd/ui/navigation/NavGraph.kt
git commit -m "feat(android): 3-tab bottom navigation + library/settings/create routes"
```

---

# Phase 3 — Deck management UI

### Task 7: CreateDeckViewModel (TDD)

**Files:**

- Create: `ui/screens/createdeck/CreateDeckViewModel.kt`
- Test: `app/src/test/java/com/flashmd/ui/CreateDeckViewModelTest.kt`

- [ ] **Step 1: Write `CreateDeckViewModel`**

```kotlin
package com.flashmd.ui.screens.createdeck

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.parser.MdParser
import com.flashmd.data.remote.ApiException
import com.flashmd.data.repository.DeckRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreateDeckUiState(
    val markdown: String = "",
    val cardCount: Int = 0,
    val isSaving: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class CreateDeckViewModel @Inject constructor(
    private val deckRepo: DeckRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CreateDeckUiState())
    val state: StateFlow<CreateDeckUiState> = _state.asStateFlow()

    fun onMarkdownChange(text: String) {
        val parsed = runCatching { MdParser.parse(text, "pasted.md") }.getOrNull()
        _state.value = _state.value.copy(
            markdown = text,
            cardCount = parsed?.cards?.size ?: 0,
            error = null,
        )
    }

    fun create() {
        val text = _state.value.markdown
        val parsed = runCatching { MdParser.parse(text, "pasted.md") }.getOrNull()
        if (parsed == null || parsed.cards.isEmpty()) {
            _state.value = _state.value.copy(error = "No flashcards found in this text.")
            return
        }
        viewModelScope.launch {
            _state.value = _state.value.copy(isSaving = true, error = null)
            try {
                deckRepo.importMarkdown(text, parsed.title)
                _state.value = _state.value.copy(isSaving = false, done = true)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isSaving = false, error = e.message)
            }
        }
    }
}
```

- [ ] **Step 2: Write the failing test**

```kotlin
package com.flashmd.ui

import com.flashmd.data.repository.DeckRepository
import com.flashmd.ui.screens.createdeck.CreateDeckViewModel
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
class CreateDeckViewModelTest {
    private val repo = mockk<DeckRepository>(relaxed = true)

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun parsesCardCountOnChange() {
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("# Deck\n\nQ: a\nA: b\n\nQ: c\nA: d")
        assertEquals(2, vm.state.value.cardCount)
    }

    @Test fun emptyMarkdownShowsErrorNotSave() = runTest {
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("nonsense with no cards")
        vm.create()
        advanceUntilIdle()
        assertTrue(vm.state.value.error != null)
        coVerify(exactly = 0) { repo.importMarkdown(any(), any()) }
    }

    @Test fun validMarkdownCallsImportAndSetsDone() = runTest {
        coEvery { repo.importMarkdown(any(), any()) } returns 1
        val vm = CreateDeckViewModel(repo)
        vm.onMarkdownChange("Q: a\nA: b")
        vm.create()
        advanceUntilIdle()
        assertTrue(vm.state.value.done)
        coVerify { repo.importMarkdown(any(), any()) }
    }
}
```

- [ ] **Step 3: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.CreateDeckViewModelTest"`
Expected: PASS (3 tests). If the parser package/`parse` signature differs, adjust the import — confirm against `data/parser/MdParser.kt` (used the same way in `DeckListViewModel`).

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/createdeck/CreateDeckViewModel.kt android/app/src/test/java/com/flashmd/ui/CreateDeckViewModelTest.kt
git commit -m "feat(android): CreateDeckViewModel with live card-count + tests"
```

---

### Task 8: CreateDeckScreen

**Files:**

- Create: `ui/screens/createdeck/CreateDeckScreen.kt`

- [ ] **Step 1: Write the screen (paste + import tabs)**

```kotlin
package com.flashmd.ui.screens.createdeck

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateDeckScreen(
    onDone: () -> Unit,
    viewModel: CreateDeckViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var tab by remember { mutableIntStateOf(0) }

    LaunchedEffect(state.done) { if (state.done) onDone() }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val stream = context.contentResolver.openInputStream(uri)
            ?: return@rememberLauncherForActivityResult
        val text = stream.bufferedReader().use { it.readText() }
        viewModel.onMarkdownChange(text)
        tab = 0
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New deck") },
                navigationIcon = { TextButton(onClick = onDone) { Text("Cancel") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Paste Markdown") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Import file") })
            }

            if (tab == 1) {
                Button(onClick = { filePicker.launch(arrayOf("text/*", "text/markdown")) }) {
                    Text("Choose .md file")
                }
                Text(
                    "Picks a Markdown file and loads it below for review.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            OutlinedTextField(
                value = state.markdown,
                onValueChange = viewModel::onMarkdownChange,
                modifier = Modifier.fillMaxWidth().heightIn(min = 200.dp),
                label = { Text("Markdown") },
                placeholder = { Text("# My Deck\n\nQ: Question\nA: Answer") },
            )

            Text(
                "${state.cardCount} cards detected",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            if (state.error != null) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }

            Button(
                onClick = { viewModel.create() },
                enabled = state.cardCount > 0 && !state.isSaving,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isSaving) CircularProgressIndicator(Modifier.size(20.dp))
                else Text("Create deck")
            }
        }
    }
}
```

- [ ] **Step 2: Commit (compiles after Phase 5)**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/createdeck/CreateDeckScreen.kt
git commit -m "feat(android): CreateDeckScreen with paste + file-import tabs"
```

---

### Task 9: Deck actions on DeckListScreen (overflow menu)

**Files:**

- Modify: `ui/screens/decklist/DeckListViewModel.kt`
- Modify: `ui/screens/decklist/DeckListScreen.kt`
- Test: `app/src/test/java/com/flashmd/ui/DeckListActionsTest.kt`

- [ ] **Step 1: Add action methods to `DeckListViewModel`**

Add inside the class (the VM already has `viewModelScope`, `deckRepo`,
`errorReporter`, `_listError`):

```kotlin
    fun rename(id: String, title: String) = viewModelScope.launch {
        try { deckRepo.renameDeck(id, title) }
        catch (e: Exception) { _listError.value = "Rename failed." }
    }

    fun addCards(id: String, markdown: String) = viewModelScope.launch {
        try { deckRepo.addCards(id, markdown) }
        catch (e: Exception) { _listError.value = "Couldn't add cards." }
    }

    fun setPublic(id: String, isPublic: Boolean) = viewModelScope.launch {
        try { deckRepo.setPublic(id, isPublic) }
        catch (e: Exception) { _listError.value = "Couldn't update sharing." }
    }

    fun delete(id: String) = viewModelScope.launch {
        try { deckRepo.deleteDeck(id) }
        catch (e: Exception) { _listError.value = "Delete failed." }
    }
```

- [ ] **Step 2: Update the `DeckListScreen` signature + FAB + per-deck menu**

Change the composable signature: replace `onLogout: () -> Unit = {}` with
`onCreateDeck: () -> Unit`, and remove the "Log out" + theme-cycle actions from
the `TopAppBar` (those move to Settings — Task 16). Point the FAB at
`onCreateDeck`. Replace the file picker usage on this screen (it now lives in
CreateDeckScreen).

Replace the `DeckCard` composable with a version exposing an overflow menu and
dialogs. Full replacement for `DeckCard` and the parts of `DeckListScreen` that
change:

```kotlin
// In DeckListScreen(...) — signature:
fun DeckListScreen(
    onStudyDeck: (String) -> Unit,
    onStatsDeck: (String) -> Unit,
    onCreateDeck: () -> Unit,
    viewModel: DeckListViewModel = hiltViewModel(),
    themeViewModel: com.flashmd.ui.theme.ThemeViewModel = hiltViewModel(),
) {
    // ...existing state collection (uiState, pending)...
    // TopAppBar actions: keep ONLY the sync chip (pending > 0). Remove theme + logout.
    // FAB onClick = onCreateDeck
    // In items(...) pass the new callbacks:
    //   DeckCard(row, onStudy, onStats,
    //            onRename = { t -> viewModel.rename(row.deck.id, t) },
    //            onAddCards = { md -> viewModel.addCards(row.deck.id, md) },
    //            onTogglePublic = { viewModel.setPublic(row.deck.id, !row.deck.isPublic) },
    //            onDelete = { viewModel.delete(row.deck.id) })
}

@Composable
private fun DeckCard(
    row: DeckRow,
    onStudy: () -> Unit,
    onStats: () -> Unit,
    onRename: (String) -> Unit,
    onAddCards: (String) -> Unit,
    onTogglePublic: () -> Unit,
    onDelete: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var addingCards by remember { mutableStateOf(false) }
    var confirmingDelete by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(row.deck.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                val last = row.deck.lastStudied?.take(10) ?: "Never studied"
                val shared = if (row.deck.isPublic) "  •  Shared" else ""
                Text(
                    "${row.totalCards} cards  •  ${row.dueCount} due  •  $last$shared",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = onStats) { Text("Stats") }
            Button(onClick = onStudy) { Text("Study") }
            Box {
                IconButton(onClick = { menuOpen = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More")
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(text = { Text("Rename") }, onClick = { menuOpen = false; renaming = true })
                    DropdownMenuItem(text = { Text("Add cards") }, onClick = { menuOpen = false; addingCards = true })
                    DropdownMenuItem(
                        text = { Text(if (row.deck.isPublic) "Unpublish" else "Publish to library") },
                        onClick = { menuOpen = false; onTogglePublic() },
                    )
                    DropdownMenuItem(text = { Text("Delete") }, onClick = { menuOpen = false; confirmingDelete = true })
                }
            }
        }
    }

    if (renaming) {
        TextPromptDialog("Rename deck", row.deck.title, "Title") { newTitle ->
            renaming = false
            if (newTitle != null && newTitle.isNotBlank()) onRename(newTitle)
        }
    }
    if (addingCards) {
        TextPromptDialog("Add cards (Markdown)", "", "Markdown", multiline = true) { md ->
            addingCards = false
            if (md != null && md.isNotBlank()) onAddCards(md)
        }
    }
    if (confirmingDelete) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text("Delete deck?") },
            text = { Text("This permanently deletes \"${row.deck.title}\".") },
            confirmButton = { TextButton(onClick = { confirmingDelete = false; onDelete() }) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { confirmingDelete = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun TextPromptDialog(
    title: String,
    initial: String,
    label: String,
    multiline: Boolean = false,
    onResult: (String?) -> Unit,
) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = { onResult(null) },
        title = { Text(title) },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                label = { Text(label) },
                singleLine = !multiline,
                modifier = if (multiline) Modifier.heightIn(min = 160.dp) else Modifier,
            )
        },
        confirmButton = { TextButton(onClick = { onResult(text) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = { onResult(null) }) { Text("Cancel") } },
    )
}
```

Add the needed imports to `DeckListScreen.kt`: `androidx.compose.material.icons.filled.MoreVert`,
`androidx.compose.material3.DropdownMenu`, `androidx.compose.material3.DropdownMenuItem`,
`androidx.compose.material3.IconButton`, `androidx.compose.material3.OutlinedTextField`,
`androidx.compose.material3.AlertDialog`, `androidx.compose.foundation.layout.heightIn`,
`androidx.compose.foundation.layout.Box`. Remove the now-unused file-picker imports.

- [ ] **Step 3: Write the VM action test**

```kotlin
package com.flashmd.ui

import com.flashmd.data.remote.ErrorReporter
import com.flashmd.data.repository.DeckRepository
import com.flashmd.data.repository.OutboxRepository
import com.flashmd.sync.SyncScheduler
import com.flashmd.ui.screens.decklist.DeckListViewModel
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DeckListActionsTest {
    private val repo = mockk<DeckRepository>(relaxed = true)
    private val reporter = mockk<ErrorReporter>(relaxed = true)
    private val outbox = mockk<OutboxRepository>(relaxed = true)
    private val scheduler = mockk<SyncScheduler>(relaxed = true)

    @Before fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        every { repo.getAllDecksFlow() } returns MutableStateFlow(emptyList())
        every { outbox.pendingCount() } returns flowOf(0L)
    }
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun actionsDelegateToRepo() = runTest {
        val vm = DeckListViewModel(repo, reporter, outbox, scheduler)
        vm.rename("d1", "New"); advanceUntilIdle()
        vm.addCards("d1", "Q: a\nA: b"); advanceUntilIdle()
        vm.setPublic("d1", true); advanceUntilIdle()
        vm.delete("d1"); advanceUntilIdle()
        coVerify { repo.renameDeck("d1", "New") }
        coVerify { repo.addCards("d1", "Q: a\nA: b") }
        coVerify { repo.setPublic("d1", true) }
        coVerify { repo.deleteDeck("d1") }
    }
}
```

> Note: `DeckListViewModel`'s constructor is `(deckRepo, errorReporter, outbox,
scheduler)` (the last two were added by the offline-first work). `init` runs
> `refresh()` + `scheduler.requestSync()` on construction — all mocks are relaxed
> so they no-op; `getAllDecksFlow()` and `outbox.pendingCount()` are stubbed
> because they feed `combine`/`stateIn` at construction.

- [ ] **Step 4: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.DeckListActionsTest"`
Expected: PASS.

- [ ] **Step 5: Commit (screen compiles after Phase 5)**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/decklist/DeckListViewModel.kt android/app/src/main/java/com/flashmd/ui/screens/decklist/DeckListScreen.kt android/app/src/test/java/com/flashmd/ui/DeckListActionsTest.kt
git commit -m "feat(android): per-deck rename/add-cards/publish/delete menu + tests"
```

---

# Phase 4 — Library UI

### Task 10: LibraryViewModel (TDD)

**Files:**

- Create: `ui/screens/library/LibraryViewModel.kt`
- Test: `app/src/test/java/com/flashmd/ui/LibraryViewModelTest.kt`

- [ ] **Step 1: Write `LibraryViewModel`**

```kotlin
package com.flashmd.ui.screens.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.LibraryDeckDto
import com.flashmd.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LibraryUiState(
    val query: String = "",
    val decks: List<LibraryDeckDto> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val repo: LibraryRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(LibraryUiState())
    val state: StateFlow<LibraryUiState> = _state.asStateFlow()

    init { search("") }

    fun onQueryChange(q: String) {
        _state.value = _state.value.copy(query = q)
        search(q)
    }

    fun search(q: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                _state.value = _state.value.copy(decks = repo.list(q), isLoading = false)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }
}
```

- [ ] **Step 2: Write the failing test**

```kotlin
package com.flashmd.ui

import com.flashmd.data.remote.dto.LibraryDeckDto
import com.flashmd.data.repository.LibraryRepository
import com.flashmd.ui.screens.library.LibraryViewModel
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
class LibraryViewModelTest {
    private val repo = mockk<LibraryRepository>()

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadsAndSearches() = runTest {
        coEvery { repo.list(any()) } returns listOf(LibraryDeckDto("d1", "Bio", "Ada", 5, null))
        val vm = LibraryViewModel(repo)
        advanceUntilIdle()
        assertEquals(1, vm.state.value.decks.size)

        coEvery { repo.list("bio") } returns listOf(LibraryDeckDto("d1", "Bio", "Ada", 5, null))
        vm.onQueryChange("bio")
        advanceUntilIdle()
        assertEquals("bio", vm.state.value.query)
        assertEquals(1, vm.state.value.decks.size)
    }
}
```

- [ ] **Step 3: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.LibraryViewModelTest"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/library/LibraryViewModel.kt android/app/src/test/java/com/flashmd/ui/LibraryViewModelTest.kt
git commit -m "feat(android): LibraryViewModel with search + tests"
```

---

### Task 11: LibraryScreen

**Files:**

- Create: `ui/screens/library/LibraryScreen.kt`

- [ ] **Step 1: Write the screen**

```kotlin
package com.flashmd.ui.screens.library

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    onOpenDeck: (String) -> Unit,
    viewModel: LibraryViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("Library", fontWeight = FontWeight.Bold) }) },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                label = { Text("Search public decks") },
                singleLine = true,
            )
            when {
                state.isLoading && state.decks.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
                state.error != null && state.decks.isEmpty() ->
                    Box(Modifier.fillMaxSize().padding(24.dp), Alignment.Center) {
                        Text(state.error!!, color = MaterialTheme.colorScheme.error)
                    }
                state.decks.isEmpty() ->
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Text("No public decks found.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(state.decks, key = { it.id }) { deck ->
                        Card(
                            Modifier.fillMaxWidth().clickable { onOpenDeck(deck.id) },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                                Text(deck.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "${deck.cardCount} cards  •  by ${deck.author ?: "Anonymous"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Commit (compiles after Phase 5)**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/library/LibraryScreen.kt
git commit -m "feat(android): LibraryScreen — searchable public deck list"
```

---

### Task 12: LibraryDetailViewModel (TDD)

**Files:**

- Create: `ui/screens/library/LibraryDetailViewModel.kt`
- Test: `app/src/test/java/com/flashmd/ui/LibraryDetailViewModelTest.kt`

- [ ] **Step 1: Write `LibraryDetailViewModel`**

```kotlin
package com.flashmd.ui.screens.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LibraryDetailUiState(
    val deck: LibraryDeckDetailDto? = null,
    val isLoading: Boolean = true,
    val isCloning: Boolean = false,
    val error: String? = null,
    val clonedDeckId: String? = null,
)

@HiltViewModel
class LibraryDetailViewModel @Inject constructor(
    private val repo: LibraryRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(LibraryDetailUiState())
    val state: StateFlow<LibraryDetailUiState> = _state.asStateFlow()

    fun load(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                _state.value = _state.value.copy(deck = repo.get(id), isLoading = false)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun clone(id: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isCloning = true, error = null)
            try {
                val newId = repo.clone(id)
                _state.value = _state.value.copy(isCloning = false, clonedDeckId = newId)
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isCloning = false, error = e.message)
            }
        }
    }
}
```

- [ ] **Step 2: Write the failing test**

```kotlin
package com.flashmd.ui

import com.flashmd.data.remote.dto.LibraryDeckDetailDto
import com.flashmd.data.repository.LibraryRepository
import com.flashmd.ui.screens.library.LibraryDetailViewModel
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
class LibraryDetailViewModelTest {
    private val repo = mockk<LibraryRepository>()

    @Before fun setUp() = Dispatchers.setMain(StandardTestDispatcher())
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun loadThenCloneSetsClonedId() = runTest {
        coEvery { repo.get("d1") } returns LibraryDeckDetailDto("d1", "Bio", "Ada", 1, null, emptyList())
        coEvery { repo.clone("d1") } returns "new1"
        val vm = LibraryDetailViewModel(repo)
        vm.load("d1"); advanceUntilIdle()
        assertEquals("Bio", vm.state.value.deck?.title)
        vm.clone("d1"); advanceUntilIdle()
        assertEquals("new1", vm.state.value.clonedDeckId)
    }
}
```

- [ ] **Step 3: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.LibraryDetailViewModelTest"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/library/LibraryDetailViewModel.kt android/app/src/test/java/com/flashmd/ui/LibraryDetailViewModelTest.kt
git commit -m "feat(android): LibraryDetailViewModel (load + clone) + tests"
```

---

### Task 13: LibraryDetailScreen

**Files:**

- Create: `ui/screens/library/LibraryDetailScreen.kt`

- [ ] **Step 1: Write the screen**

```kotlin
package com.flashmd.ui.screens.library

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryDetailScreen(
    deckId: String,
    onBack: () -> Unit,
    onCloned: (String) -> Unit,
    viewModel: LibraryDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(deckId) { viewModel.load(deckId) }
    LaunchedEffect(state.clonedDeckId) { state.clonedDeckId?.let(onCloned) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.deck?.title ?: "Deck") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
        floatingActionButton = {
            if (state.deck != null) {
                ExtendedFloatingActionButton(
                    onClick = { viewModel.clone(deckId) },
                    text = { Text(if (state.isCloning) "Cloning…" else "Clone to my decks") },
                    icon = {},
                )
            }
        },
    ) { padding ->
        when {
            state.isLoading ->
                Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) { CircularProgressIndicator() }
            state.error != null ->
                Box(Modifier.fillMaxSize().padding(padding).padding(24.dp), Alignment.Center) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                }
            else -> {
                val deck = state.deck!!
                LazyColumn(
                    Modifier.fillMaxSize().padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    item {
                        Text(
                            "${deck.cardCount} cards  •  by ${deck.author ?: "Anonymous"}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    items(deck.cards) { card ->
                        Card(
                            Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(12.dp)) {
                                Text(card.front, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(2.dp))
                                Text(card.back, style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Commit (compiles after Phase 5)**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/library/LibraryDetailScreen.kt
git commit -m "feat(android): LibraryDetailScreen with card preview + clone"
```

---

# Phase 5 — Settings UI

### Task 14: ThemeViewModel.set + SettingsViewModel (TDD)

**Files:**

- Modify: `ui/theme/ThemeViewModel.kt`
- Create: `ui/screens/settings/SettingsViewModel.kt`
- Test: `app/src/test/java/com/flashmd/ui/SettingsViewModelTest.kt`

- [ ] **Step 1: Add `set(mode)` to `ThemeViewModel`**

```kotlin
    fun set(mode: ThemeMode) {
        viewModelScope.launch { store.setMode(mode) }
    }
```

- [ ] **Step 2: Write `SettingsViewModel`**

```kotlin
package com.flashmd.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.flashmd.data.remote.ApiException
import com.flashmd.data.remote.dto.UserDto
import com.flashmd.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val user: UserDto? = null,
    val displayNameDraft: String = "",
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            try {
                val user = auth.getMe()
                _state.value = _state.value.copy(
                    user = user, displayNameDraft = user.displayName ?: "", isLoading = false,
                )
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun onDisplayNameChange(v: String) {
        _state.value = _state.value.copy(displayNameDraft = v.take(60), message = null)
    }

    fun saveDisplayName() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSaving = true, error = null, message = null)
            try {
                val user = auth.updateProfile(_state.value.displayNameDraft)
                _state.value = _state.value.copy(user = user, isSaving = false, message = "Saved")
            } catch (e: ApiException) {
                _state.value = _state.value.copy(isSaving = false, error = e.message)
            }
        }
    }

    fun resendVerification() {
        viewModelScope.launch {
            try { auth.resendVerification(); _state.value = _state.value.copy(message = "Verification email sent") }
            catch (e: ApiException) { _state.value = _state.value.copy(error = e.message) }
        }
    }

    fun changePassword() {
        val email = _state.value.user?.email ?: return
        viewModelScope.launch {
            try { auth.forgotPassword(email); _state.value = _state.value.copy(message = "Password reset email sent") }
            catch (e: ApiException) { _state.value = _state.value.copy(error = e.message) }
        }
    }
}
```

- [ ] **Step 3: Write the failing test**

```kotlin
package com.flashmd.ui

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

    @Test fun changePasswordUsesEmail() = runTest {
        coEvery { auth.getMe() } returns UserDto("u1", "a@b.c", "user", "free", null, null)
        val vm = SettingsViewModel(auth)
        advanceUntilIdle()
        vm.changePassword(); advanceUntilIdle()
        coVerify { auth.forgotPassword("a@b.c") }
    }
}
```

- [ ] **Step 4: Run the test**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.flashmd.ui.SettingsViewModelTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/flashmd/ui/theme/ThemeViewModel.kt android/app/src/main/java/com/flashmd/ui/screens/settings/SettingsViewModel.kt android/app/src/test/java/com/flashmd/ui/SettingsViewModelTest.kt
git commit -m "feat(android): SettingsViewModel + ThemeViewModel.set + tests"
```

---

### Task 15: SettingsScreen

**Files:**

- Create: `ui/screens/settings/SettingsScreen.kt`

- [ ] **Step 1: Write the screen**

```kotlin
package com.flashmd.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.flashmd.data.local.ThemeMode
import com.flashmd.ui.theme.ThemeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onLogout: () -> Unit,
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
            Text("Security", style = MaterialTheme.typography.titleMedium)
            OutlinedButton(onClick = { viewModel.changePassword() }) { Text("Change password (email link)") }

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
```

- [ ] **Step 2: Commit (compiles after Task 16)**

```bash
git add android/app/src/main/java/com/flashmd/ui/screens/settings/SettingsScreen.kt
git commit -m "feat(android): SettingsScreen — profile, account, theme, password, logout"
```

---

### Task 16: Compile the whole app + fix DeckListScreen wiring

**Files:**

- Modify: `ui/screens/decklist/DeckListScreen.kt` (finalize: remove theme/logout actions, confirm `onCreateDeck` wired) — most done in Task 9; this task makes the full app compile.

- [ ] **Step 1: Compile the debug variant**

Run: `cd android && ./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL. If errors reference `DeckListScreen` params (e.g. a
lingering `onLogout`), reconcile its signature with the `NavGraph` call from
Task 6 (`onStudyDeck`, `onStatsDeck`, `onCreateDeck`) and remove leftover
imports for the removed file picker / theme button / logout button.

- [ ] **Step 2: Run the full unit-test suite**

Run: `cd android && ./gradlew :app:testDebugUnitTest`
Expected: all green — existing (parser, sm2, api-contract, db/outbox/local-store,
sync-contract) plus new (library/deck/auth contract tests; create/library/
library-detail/settings/deck-actions VM tests).

- [ ] **Step 3: Commit**

```bash
git add -A android/app/src/main/java/com/flashmd/ui/screens/decklist/DeckListScreen.kt
git commit -m "fix(android): finalize deck-list wiring for bottom-nav + create flow"
```

---

# Phase 6 — Verify & ship

### Task 17: Full verification

- [ ] **Step 1: Compile + all Android unit tests**

Run: `cd android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL, all tests pass.

- [ ] **Step 2: Server + shared unchanged (sanity)**

Run: `cd packages/server && npm test && cd ../shared && npm test`
Expected: server 50, shared 24 — unchanged (no backend edits this plan).

- [ ] **Step 3: Optional on-device smoke (at a desk)**

Build the debug APK; verify: bottom nav switches Decks/Library/Settings; create a
deck from pasted Markdown; rename / add cards / publish / delete from the ⋮ menu;
browse + search the library, open a deck, clone it (lands in study); edit display
name, resend-verification (if unverified), switch theme, trigger password-reset
email, log out.

### Task 18: Ship

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

`android/**` changes trigger the Android Release workflow → Play internal. No
server deploy. (Confirm with the user before pushing if required.)

- [ ] **Step 2: Verify the Android Release run succeeds and the build reaches Play internal.**

---

## Notes for the implementer

- **No server changes.** Every endpoint exists; this is UI + client wiring only.
- **JSON casing (verified):** library + `/api/auth/me` responses are **camelCase**;
  the deck-list response and the clone response (`card_count`) are **snake_case**.
  DTOs above reflect this.
- **New ViewModels back UI state with a plain `MutableStateFlow`** (not `stateIn`),
  so `.value` is assertable in unit tests without a collector. `DeckListViewModel`
  keeps its existing `combine/stateIn`; its new action methods are verified via
  mockk, not state reads.
- **`MdParser`** is reused exactly as `DeckListViewModel` uses it
  (`MdParser.parse(text, fileName)` → `.title`, `.cards`). Confirm the package
  import (`com.flashmd.data.parser.MdParser`).
- **Compile is deferred** for the screen/nav tasks (6, 8, 11, 13, 15) because they
  reference each other; Task 16 is the first full-app compile gate. ViewModel and
  contract tests in each task still run independently before then.
