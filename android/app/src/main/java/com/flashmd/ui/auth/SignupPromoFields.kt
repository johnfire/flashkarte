package com.flashmd.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.flashmd.R

@Composable
fun SignupPromoFields(state: AuthUiState, viewModel: AuthViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = state.promoCode,
            onValueChange = { viewModel.onPromoCodeChange(it.take(40)) },
            label = { Text(stringResource(R.string.promo_code)) },
            singleLine = true,
            enabled = !state.isSubmitting,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedButton(
            onClick = { if (state.promo != null) viewModel.onPromoCodeChange("") else viewModel.applyPromo() },
            enabled = !state.isSubmitting && !state.isApplyingPromo && state.promoCode.isNotBlank(),
        ) {
            Text(stringResource(if (state.promo != null) R.string.promo_remove else R.string.promo_apply))
        }
        if (state.isApplyingPromo) LinearProgressIndicator(Modifier.fillMaxWidth())
        state.promo?.let { promo ->
            Text(stringResource(R.string.promo_applied, promo.code), color = MaterialTheme.colorScheme.primary)
            if (promo.kind == "free_access") {
                Text(stringResource(R.string.promo_free_summary, promo.freeDays ?: 0))
                Text(stringResource(R.string.promo_free_note), style = MaterialTheme.typography.bodySmall)
            } else {
                val duration = stringResource(if (promo.discountDuration == "forever") R.string.promo_forever else R.string.promo_once)
                Text(stringResource(R.string.promo_discount_summary, promo.percentOff ?: 0, duration))
                Text(stringResource(R.string.promo_website_note), style = MaterialTheme.typography.bodySmall)
                DiscountPlanFields(state, viewModel)
            }
        }
    }
}

@Composable
private fun DiscountPlanFields(state: AuthUiState, viewModel: AuthViewModel) {
    val eligiblePlan = state.promo?.eligiblePlan ?: return
    listOf("monthly", "yearly").filter { eligiblePlan == "any" || eligiblePlan == it }.forEach { plan ->
        Row(Modifier.fillMaxWidth().selectable(selected = state.signupPlan == plan, enabled = !state.isSubmitting,
            role = Role.RadioButton, onClick = { viewModel.onSignupPlanChange(plan) }), verticalAlignment = Alignment.CenterVertically) {
            RadioButton(selected = state.signupPlan == plan, onClick = null, enabled = !state.isSubmitting)
            Text(stringResource(if (plan == "monthly") R.string.promo_monthly else R.string.promo_yearly))
        }
    }
}
