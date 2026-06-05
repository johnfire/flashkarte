# Android full functionality — Design

_Date: 2026-06-05 · Scope: Android app · No server changes_

## Goal

Bring the Android app to feature parity with the web app for three areas the
user requested: **managing decks** (create from Markdown, rename, add cards,
publish/unpublish, delete), **the public library** (browse, search, clone), and
**account settings** (display name, account info, email verification, password
change, theme). Every endpoint already exists on the server — this is purely
Android UI + API-client wiring.

## Background / current state

Android today (`android/app/src/main/java/com/flashmd`):

- **Navigation** (`ui/navigation/NavGraph.kt`): 4 routes — `decks` (start),
  `study/{deckId}`, `summary/...`, `stats/{deckId}`. No bottom nav.
- **Decks**: `DeckListScreen` lists decks; a FAB opens a file picker that imports
  a `.md`/`.txt` via `DeckRepository.importMarkdown` → `POST /api/decks`. A
  per-deck card offers Study + Stats. No create-from-text, rename, add-cards,
  publish, or delete UI.
- **API** (`data/remote/FlashkarteApi.kt`): auth (signup/login/refresh/logout),
  decks (list/get/import/delete), study (batch/stats/review/sync), client-errors.
  Library and account-profile endpoints are **not** wired.
- **Settings**: none. Theme is a cycle button in the deck-list top bar
  (`ThemeViewModel`).

The server already provides everything needed (verified):

- Decks: `PATCH /api/decks/{id}` (`{ title?, isPublic? }`), `POST /api/decks/{id}/cards` (`{ markdown }`).
- Library: `GET /api/library?q=`, `GET /api/library/{id}`, `POST /api/library/{id}/clone`.
- Auth/profile: `GET /api/auth/me`, `PATCH /api/auth/me` (`{ displayName }`),
  `POST /api/auth/resend-verification`, `POST /api/auth/forgot-password` (`{ email }`).

## Architecture

Follow the existing per-feature pattern: one `@Composable` screen + one
`@HiltViewModel` per feature, talking to a `@Singleton` repository that wraps
`FlashkarteApi` via the existing `apiCall { }` helper (maps errors to
`ApiException`). DTOs are `@Serializable` data classes in `data/remote/dto`.
State is exposed as `StateFlow<UiState>` and collected with
`collectAsStateWithLifecycle()`, mirroring `DeckListViewModel`.

### Navigation

Introduce a top-level `Scaffold` with a `NavigationBar` (bottom) hosting three
tabs, each its own nav route:

- **Decks** → `DeckListScreen` (existing, start tab)
- **Library** → `LibraryScreen` (new)
- **Settings** → `SettingsScreen` (new)

`study/{deckId}`, `summary/...`, `stats/{deckId}`, `library/{deckId}` (detail),
and `decks/new` (create) remain **full-screen pushed routes** (no bottom bar),
navigated via `navController.navigate(...)`. The bottom bar is shown only on the
three tab destinations; pushed routes hide it (check current route in the
`NavHost`'s `currentBackStackEntryAsState`).

## Feature 1 — Deck management

**New-deck screen (`decks/new`, `ui/screens/createdeck/`)**

- Two tabs (Compose `TabRow`): **Paste Markdown** and **Import file**.
- Paste: a multiline `TextField` for Markdown; below it a live preview line —
  "N cards" — computed by parsing with the existing `MdParser.parse(text, "pasted.md")`
  on each change (already used in `DeckListViewModel`). A "Create" button is
  enabled only when `parsed.cards.isNotEmpty()`; it calls
  `DeckRepository.importMarkdown(text, parsed.title)`.
- Import file: the existing `OpenDocument` file-picker flow, moved here verbatim
  from `DeckListScreen`.
- On success, pop back to Decks and refresh the list.
- Reached via the Decks-tab FAB (replaces the current direct file picker).

**Per-deck actions (on `DeckListScreen`)**

Add an overflow (`⋮`) `IconButton` + `DropdownMenu` to each `DeckCard`:

- **Rename** → dialog with a text field → `DeckRepository.renameDeck(id, title)` →
  `PATCH /api/decks/{id}` `{ title }`.
- **Add cards** → dialog/screen with a Markdown field → `DeckRepository.addCards(id, markdown)` →
  `POST /api/decks/{id}/cards` `{ markdown }`.
- **Publish to library / Unpublish** → toggles `isPublic` →
  `DeckRepository.setPublic(id, isPublic)` → `PATCH /api/decks/{id}` `{ isPublic }`.
  Label reflects the deck's current `isPublic` (see DTO change below).
- **Delete** → confirm dialog → existing `DeckRepository.deleteDeck(id)`.

After any mutation the VM calls `deckRepo.refresh()`.

**DTO change:** `DeckListItemDto` gains `@SerialName("is_public") val isPublic: Boolean = false`.
The deck-list response is snake_case (confirmed: `decks.repository.ts` selects
`is_public`, and the existing DTO already maps `source_filename`/`created_at`/etc.
via `@SerialName`). `Deck` domain model gains `val isPublic: Boolean = false`,
mapped in `DeckRepository.toDomain()`.

**New API methods:**

```kotlin
@PATCH("api/decks/{id}") suspend fun updateDeck(@Path("id") id: String, @Body body: UpdateDeckRequest): DeckDetailDto
@POST("api/decks/{id}/cards") suspend fun addCards(@Path("id") id: String, @Body body: AddCardsRequest): AddCardsResponse
```

```kotlin
@Serializable data class UpdateDeckRequest(val title: String? = null, val isPublic: Boolean? = null)
@Serializable data class AddCardsRequest(val markdown: String)
@Serializable data class AddCardsResponse(@SerialName("deck_id") val deckId: String, val added: Int)
```

## Feature 2 — Library

**`LibraryScreen` (`library` tab, `ui/screens/library/`)**

- Search field at top; debounced query drives `LibraryRepository.list(q)`.
- A `LazyColumn` of cards: title, author (`display_name`), "N cards". Tapping a
  card navigates to `library/{deckId}`.
- Loading / empty / error states mirror `DeckListScreen`.

**`LibraryDetailScreen` (`library/{deckId}`)**

- Shows title, author, card count, and a preview list of cards (front/back) from
  `LibraryRepository.get(id)`.
- A **Clone** button calls `LibraryRepository.clone(id)`; on success it refreshes
  the deck list and navigates to `study/{newDeckId}` (study the freshly cloned
  deck), matching the web flow.

**New API methods:**

```kotlin
@GET("api/library") suspend fun listLibrary(@Query("q") q: String?): LibraryListResponse
@GET("api/library/{id}") suspend fun getLibraryDeck(@Path("id") id: String): LibraryDeckDetailDto
@POST("api/library/{id}/clone") suspend fun cloneLibraryDeck(@Path("id") id: String): DeckCreatedDto
```

```kotlin
@Serializable data class LibraryDeckDto(
    val id: String, val title: String, val author: String? = null,
    @SerialName("cardCount") val cardCount: Int = 0,
    @SerialName("publishedAt") val publishedAt: String? = null,
)
@Serializable data class LibraryListResponse(val decks: List<LibraryDeckDto>)
@Serializable data class LibraryDeckDetailDto(
    val id: String, val title: String, val author: String? = null,
    @SerialName("cardCount") val cardCount: Int = 0,
    @SerialName("publishedAt") val publishedAt: String? = null,
    val cards: List<CardContentDto> = emptyList(),
)
```

`clone` reuses the existing `DeckCreatedDto` (`{ id, title, card_count }` — note
the clone response is snake_case `card_count`, unlike the library list/detail).
The library list/detail responses are **camelCase** (confirmed:
`library.service.ts` `toLibraryDeck` emits `author`, `cardCount`, `publishedAt`),
so the Kotlin property names match without `@SerialName` — the `@SerialName`
annotations above are redundant-but-harmless and may be dropped. The
`SyncApiContractTest`/`ApiContractTest` pattern pins these exact shapes.

## Feature 3 — Settings

**`SettingsScreen` (`settings` tab, `ui/screens/settings/`)** — sections:

- **Profile:** display-name `TextField` + Save (`AuthRepository.updateProfile(name)` →
  `PATCH /api/auth/me`). Max 60 chars (server validates; mirror client-side).
  Helper text: "Shown as the author on decks you publish."
- **Account:** read-only email, plan (`accountType`), and email-verification
  status. If unverified, a **Resend verification email** button
  (`AuthRepository.resendVerification()` → `POST /api/auth/resend-verification`).
- **Appearance:** theme control (System / Light / Dark) — reuse `ThemeViewModel`;
  remove the cycle button from the deck-list top bar.
- **Security:** **Change password** button → calls
  `AuthRepository.forgotPassword(currentUserEmail)` → `POST /api/auth/forgot-password`,
  then shows "We've emailed you a reset link." (Reset completes on the web page;
  no in-app token entry — per decision.)
- **Log out** (moved from the deck-list top bar).

**DTO change:** expand `UserDto` to
`{ id, email, role, accountType, emailVerifiedAt, displayName }` (extra fields
optional with defaults so existing auth parsing is unaffected). `PublicUser` is
**camelCase** (confirmed: `auth.service.ts` `toPublicUser` emits `accountType`,
`emailVerifiedAt`, `displayName`), so the Kotlin property names match directly —
no `@SerialName` needed.

**New API methods:**

```kotlin
@GET("api/auth/me") suspend fun getMe(): MeResponse
@PATCH("api/auth/me") suspend fun updateMe(@Body body: UpdateProfileRequest): MeResponse
@POST("api/auth/resend-verification") suspend fun resendVerification(): retrofit2.Response<Unit>
@POST("api/auth/forgot-password") suspend fun forgotPassword(@Body body: ForgotPasswordRequest): retrofit2.Response<Unit>
```

```kotlin
@Serializable data class MeResponse(val user: UserDto)
@Serializable data class UpdateProfileRequest(val displayName: String)
@Serializable data class ForgotPasswordRequest(val email: String)
```

The current logged-in email comes from `SessionStore` (already stores user email)
or `GET /api/auth/me` on screen load.

## Error handling

All repository calls go through the existing `apiCall { }` wrapper that throws
`ApiException` with a user-facing message. ViewModels catch it, set an error
field on their UI state, and surface it inline (text + retry) or via a dialog,
exactly as `DeckListViewModel` does (and report unexpected exceptions through the
existing `ErrorReporter`). Library and `me` fetches fall back to clear empty/error
states; there is no offline support for these (always-online, per the offline-first
spec's scope).

## Testing

- **API contract** (`app/src/test`, MockWebServer, mirroring `ApiContractTest.kt`):
  pin the JSON shapes for `GET /api/library`, `GET /api/library/{id}`,
  `POST /api/library/{id}/clone`, `GET /api/auth/me`, and the request bodies for
  `PATCH /api/decks/{id}`, `POST /api/decks/{id}/cards`, `PATCH /api/auth/me`.
- **ViewModel unit tests** (mockk the repositories):
  - `LibraryViewModel`: search updates list; clone success triggers navigation
    callback; error sets error state.
  - `SettingsViewModel`: load populates fields; save calls `updateProfile` and
    reflects success; resend/forgot-password call the right repo methods.
  - `CreateDeckViewModel`: paste with parseable Markdown enables create and calls
    `importMarkdown`; empty/garbage shows "no cards".
  - `DeckListViewModel`: rename / addCards / setPublic / delete call the repo and
    refresh.
- `./gradlew :app:compileDebugKotlin :app:testDebugUnitTest` green. No
  emulator-dependent (instrumented) tests; manual on-device smoke at the end.

## Out of scope (v1)

- API-key management (web-only).
- In-app email-verification token entry and in-app password reset token entry
  (both finish via the emailed web links).
- Offline support for library/settings (always-online).
- Rich Markdown editor (plain multiline text field is sufficient).

## Rollout

Single Android change set, shipped via the existing Play-internal pipeline on
push to `main`. No server deploy. Verify on the internal track after build.
