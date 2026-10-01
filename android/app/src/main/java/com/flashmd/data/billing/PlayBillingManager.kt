package com.flashmd.data.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClient.ProductType
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.Purchase
import com.flashmd.BuildConfig
import com.flashmd.data.repository.BillingRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.coroutines.resume

data class PlaySubscriptionOffer(
    val basePlanId: String,
    val productDetails: ProductDetails,
    val offerToken: String,
    val formattedPrice: String,
)

@Singleton
class PlayBillingManager @Inject constructor(
    @ApplicationContext context: Context,
    private val repository: BillingRepository,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client = BillingClient.newBuilder(context)
        .setListener { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                purchases.orEmpty().forEach(::submitPurchased)
            }
        }
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .build()

    suspend fun offers(): Result<List<PlaySubscriptionOffer>> =
        kotlinx.coroutines.suspendCancellableCoroutine { continuation ->
            val query = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(BuildConfig.PLAY_SUBSCRIPTION_ID)
                            .setProductType(ProductType.SUBS)
                            .build(),
                    ),
                )
                .build()
            fun finish(result: Result<List<PlaySubscriptionOffer>>) {
                if (continuation.isActive) continuation.resume(result) {}
            }
            connect { billingResult ->
                if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    finish(Result.failure(IllegalStateException(billingResult.debugMessage)))
                    return@connect
                }
                client.queryProductDetailsAsync(query) { result, details: List<ProductDetails> ->
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                        finish(Result.failure(IllegalStateException(result.debugMessage)))
                        return@queryProductDetailsAsync
                    }
                    val offers = details.flatMap { product ->
                        product.subscriptionOfferDetails.orEmpty().mapNotNull { offer ->
                            val basePlan = offer.basePlanId
                            if (basePlan != BuildConfig.PLAY_MONTHLY_BASE_PLAN_ID &&
                                basePlan != BuildConfig.PLAY_YEARLY_BASE_PLAN_ID
                            ) return@mapNotNull null
                            PlaySubscriptionOffer(
                                basePlan,
                                product,
                                offer.offerToken,
                                offer.pricingPhases.pricingPhaseList.lastOrNull()?.formattedPrice
                                    ?: "",
                            )
                        }
                    }
                    finish(Result.success(offers))
                }
            }
        }

    fun launch(activity: Activity, offer: PlaySubscriptionOffer): Boolean {
        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(offer.productDetails)
            .setOfferToken(offer.offerToken)
            .build()
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()
        return client.launchBillingFlow(activity, params).responseCode ==
            BillingClient.BillingResponseCode.OK
    }

    fun queryExistingPurchases() {
        connect { result ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@connect
            client.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(ProductType.SUBS).build(),
            ) { purchaseResult, purchases ->
                if (purchaseResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    purchases.forEach(::submitPurchased)
                }
            }
        }
    }

    private fun submitPurchased(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        scope.launch { runCatching { repository.submitGooglePlayPurchase(purchase.purchaseToken) } }
    }

    private fun connect(callback: (com.android.billingclient.api.BillingResult) -> Unit) {
        if (client.isReady) {
            callback(
                com.android.billingclient.api.BillingResult.newBuilder()
                    .setResponseCode(BillingClient.BillingResponseCode.OK)
                    .build(),
            )
            return
        }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                callback(result)
            }

            override fun onBillingServiceDisconnected() = Unit
        })
    }
}
