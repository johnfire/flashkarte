package com.flashmd.ui.screens.settings

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.flashmd.R
import com.flashmd.data.remote.dto.BillingStatusDto
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

fun formatPromoExpiry(timestamp: String, zone: ZoneId = ZoneId.systemDefault(), locale: Locale = Locale.getDefault()): String =
    OffsetDateTime.parse(timestamp).atZoneSameInstant(zone)
        .format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(locale))

@Composable
fun PromoBillingStatus(status: BillingStatusDto) {
    status.promoAccessEndsAt?.let { expiry ->
        Text(stringResource(R.string.promo_ends_at, formatPromoExpiry(expiry)))
    }
    status.signupDiscount?.let { discount ->
        Text(stringResource(R.string.promo_applied, discount.code))
        Text(stringResource(R.string.promo_website_note))
    }
}
