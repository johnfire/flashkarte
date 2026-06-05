# Android release (Google Play)

CI builds a **signed AAB** and uploads it to the Play **internal testing** track
via the Gradle Play Publisher plugin. It runs on push to `main` when `android/**`
changes, or manually (Actions → "Android Release" → Run workflow).

- App ID: `de.christopherrehm.flashkarte` (permanent)
- Upload keystore: `~/keystores/flashkarte-upload.jks` (password in
  `~/keystores/flashkarte-upload.creds.txt` — back this up to your password
  manager; **not** in git)
- `versionCode` = GitHub run number + 10 (monotonic); `versionName` = `0.1.0`

## CI / repo side — DONE

- Gradle Play Publisher plugin + `play { track = "internal" }`
- Release signing wired from `UPLOAD_KEYSTORE_*` env (decoded from secrets in CI)
- Workflow `.github/workflows/android-release.yml` (skips cleanly until the Play
  service-account secret exists)
- GitHub secrets set: `UPLOAD_KEYSTORE_BASE64`, `UPLOAD_KEYSTORE_PASSWORD`,
  `UPLOAD_KEY_ALIAS`, `UPLOAD_KEY_PASSWORD`

## Google side — YOU (needs your Play / Google Cloud account)

1. **Create the app** in [Play Console](https://play.google.com/console) →
   _Create app_. Name "flashkarte", app type App, Free.
2. **Complete the required declarations** (left nav, "Dashboard"/"Policy"):
   app access, ads, content rating, target audience, **data safety**, and a
   **privacy policy URL** (required — the app has accounts + error reporting).
3. **First release (manual, once):** Play requires the very first AAB of a new
   app to be uploaded by hand. Create an **Internal testing** release and upload
   `android/app/build/outputs/bundle/release/app-release.aab` (I can build this
   for you with the upload key). Opt into **Play App Signing** when prompted
   (Google holds the signing key; our keystore is the _upload_ key).
4. **Service account for the API:**
   - Play Console → _Setup → API access_ → link/create a Google Cloud project.
   - Create a service account (in the linked GCP project), then back in Play
     Console → _Users and permissions_ → **Invite** the service-account email and
     grant **Release to testing tracks** (or Admin) for this app.
   - Create a **JSON key** for the service account and download it.
5. **Hand me the JSON** (or run it yourself):
   ```bash
   gh secret set PLAY_SERVICE_ACCOUNT_JSON < path/to/service-account.json
   ```

After step 5, every `android/**` push to `main` auto-publishes a new build to the
internal track. Add testers via Play Console → Internal testing → Testers, and
share the opt-in link.

## Manual / local build of the signed AAB

```bash
cd android
VERSION_CODE=1 \
UPLOAD_KEYSTORE_FILE=~/keystores/flashkarte-upload.jks \
UPLOAD_KEYSTORE_PASSWORD=<password> \
UPLOAD_KEY_ALIAS=upload \
UPLOAD_KEY_PASSWORD=<password> \
./gradlew :app:bundleRelease
# -> app/build/outputs/bundle/release/app-release.aab
```
