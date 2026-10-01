# Flashkarte billing setup

The app uses one server-side entitlement record for both payment providers:

- Web: Stripe Checkout subscriptions.
- Android: Google Play Billing subscriptions.
- Free plan: ten active units combined across decks, legacy courses, and
  structured courses. A course collection counts as one unit.
- Paid plan: unlimited active units.

## Stripe

1. Create one Stripe product with recurring prices of €5/month and €50/year.
2. Put the two resulting price IDs in `STRIPE_PRICE_MONTHLY` and
   `STRIPE_PRICE_YEARLY`.
3. Configure these URLs on the server:
   `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, and
   `STRIPE_PORTAL_RETURN_URL`.
4. Create a webhook endpoint at
   `/api/billing/stripe/webhook`. Enable `checkout.session.completed` and
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
5. Enable Stripe’s customer portal. The Settings page’s “Manage subscription”
   button uses it for cancellation, payment-method updates, and invoices.

## Google Play

1. In Play Console, create a subscription product with ID `flashkarte_pro`.
2. Add base plans `monthly` and `yearly`, with the matching €5 and €50
   recurring prices. If different IDs are used, set the three `PLAY_*` build
   variables in the Android build and the two Google base-plan variables on the
   server.
3. Create a Google Cloud service account, grant it the required Play Console
   app permissions, and store its JSON key outside Git. Set
   `GOOGLE_PLAY_PACKAGE_NAME` and
   `GOOGLE_PLAY_SERVICE_ACCOUNT_FILE` on the server.
4. Configure Play real-time developer notifications through a Google Cloud
   Pub/Sub topic and point the push subscription at
   `/api/billing/google-play/rtdn`. Protect the push with the same
   `GOOGLE_PLAY_RTDN_TOKEN` configured on the server.
5. Keep the Android application ID and Play package name aligned. The current
   project uses `de.christopherrehm.flashkarte`.
6. For internal testing, add the tester’s Google account to the Play test and
   install the internal-test build. The app login remains the Flashkarte
   account; Google Play uses the device’s Play account for the purchase.

After changing the production environment, run the database migration and
restart the app and worker containers. Never commit Stripe secrets, webhook
secrets, or the Google service-account JSON key.
