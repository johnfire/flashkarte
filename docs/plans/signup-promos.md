# Signup promos

Implemented locally on 2026-10-05 for the website and Android. Changes have not
been pushed or deployed.

## Customer behavior

Customers can enter and apply one promo code while creating an account. The
preview shows its benefit before signup. Editing the code removes the applied
benefit, and signup rechecks availability and plan eligibility on the server.

- Free-access promos grant unlimited access for 1–365 days without payment
  details. Access automatically returns to the Free plan at expiry. Existing
  content is preserved; the normal active-content limit applies again.
- Discount promos give 1–100% off the first subscription payment or every
  renewal. Admins can allow monthly, yearly, or either plan. The selected plan
  is stored with the activation, and the discount applies to that plan's first
  website checkout.
- Android activates free-access promos directly. Paid discounts entered during
  Android signup are saved for website checkout. Google Play purchases retain
  their Google Play prices. Signup and settings explain this behavior; native
  Google Play discount offers are outside this implementation.
- Settings show the free-access end date or the saved signup discount. Account
  exports include promo activations; account deletion removes them.

The user confirmed code entry, both clients, and returning to Free after free
access. The Android website-discount behavior was the stated default for the
remaining optional payment-provider question.

## Admin behavior

The website Admin screen includes Signup promos with creation, listing, and
pause/resume controls. Each promo has a unique case-insensitive code, benefit,
optional signup deadline, and optional activation cap. Codes support letters,
numbers, underscores, and hyphens, with a length of 3–40 characters.

Caps count successful signup activations, including discounted signups where
payment is abandoned. Pausing or expiring a code stops new activations;
existing activated benefits continue. The admin form explains these rules.

Discount creation provisions a Stripe coupon using the existing billing
configuration. Free-access promos work without Stripe configuration. Promo
definitions are immutable after creation apart from pause/resume.

## Persistence and boundaries

Migration `045_signup_promos.sql` adds definitions and per-user activations.
Availability, the final remaining slot, activation, and account creation share
a database transaction. Failed signup rolls back the claim. Free access is
checked against database time on every entitlement check, with no expiry job.

Admin mutations and activations are audited in the same transaction with the
authenticated actor and request correlation ID. Public preview is rate limited
and returns only benefit details. Admin access retains the existing verified
admin and full-scope authorization requirements.

Discount checkout locks the activation, reuses an open session, replaces an
expired session, and rejects a completed session before webhook delivery.
Idempotency keys protect retries. Any prior subscription prevents another
signup discount checkout. Existing subscription webhook processing is retained.

Promo labels and benefit descriptions on the website and Android are translated
into English, German, Spanish, and French.

## Verification

- Full workspace unit regression passed, with focused tests repeated after
  checkout retry and accessibility changes.
- All 34 PostgreSQL integration suites passed (256 tests), including concurrent
  final-slot claims, rollback, entitlement expiry, and account preservation.
- Website browser coverage exercises admin creation, pause/resume, signup,
  verification, expiry display, and return to Free alongside existing flows.
  All 27 browser tests passed; the promo flow also passed after the final rebuild.
- Android debug build and full JVM tests passed, including signup state,
  actual Retrofit request serialization, and local-date expiry formatting.
- Workspace typechecks, root lint, and formatting checks passed.

The temporary test database runs in `flashkarte-promos-test`, bound only to
127.0.0.1:55435, using disposable `flashkarte_test`. Browser and database
integration suites must run sequentially against this database because existing
integration fixtures truncate shared tables.

No live Stripe transaction or Android device UI test was performed. No device
or configured emulator was available. Stripe request contracts and retries are
covered by automated tests; live billing validation remains a release check.

Stripe references: [coupon creation](https://docs.stripe.com/api/coupons/create)
and [Checkout session creation](https://docs.stripe.com/api/checkout/sessions/create).
