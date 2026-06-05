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
