package com.flashmd.data.local

import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/** Source of UUIDs + timestamps; injectable so tests can make events deterministic. */
@Singleton
open class EventFactory @Inject constructor() {
    open fun newId(): String = UUID.randomUUID().toString()
    open fun nowIso(): String = Instant.now().toString()
}
