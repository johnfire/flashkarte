package com.flashmd.ui

import com.flashmd.ui.screens.settings.formatPromoExpiry
import java.time.ZoneId
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

class PromoExpiryTest {
    @Test fun expiryUsesTheCustomersLocalDate() {
        assertEquals("Oct 6, 2026", formatPromoExpiry("2026-10-05T23:30:00Z", ZoneId.of("Europe/Berlin"), Locale.US))
        assertEquals("Oct 5, 2026", formatPromoExpiry("2026-10-05T23:30:00Z", ZoneId.of("America/Los_Angeles"), Locale.US))
    }
}
