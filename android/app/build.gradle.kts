plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.play.publisher)
}

// Upload keystore + Play service-account creds come from the environment in CI
// (decoded from secrets). Absent locally, so debug builds and the test job work
// unchanged; release signing + publishing only engage when these are present.
val uploadKeystore = System.getenv("UPLOAD_KEYSTORE_FILE")?.let { file(it) }
val playCredentials = System.getenv("PLAY_SERVICE_ACCOUNT_FILE")?.let { file(it) }

android {
    namespace = "com.flashmd"
    compileSdk = 35

    defaultConfig {
        applicationId = "de.christopherrehm.flashkarte"
        minSdk = 26
        targetSdk = 35
        // Play requires a monotonically increasing versionCode; CI passes the
        // workflow run number. Defaults to 1 for local builds.
        versionCode = System.getenv("VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = "1.0.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Backend base URL. The app talks to the deployed HTTPS API; there is no
        // separate dev backend, so debug and release point at the same host.
        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"https://flashkarte.christopherrehm.de/\"",
        )
    }

    if (uploadKeystore != null && uploadKeystore.exists()) {
        signingConfigs {
            create("release") {
                storeFile = uploadKeystore
                storePassword = System.getenv("UPLOAD_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("UPLOAD_KEY_ALIAS")
                keyPassword = System.getenv("UPLOAD_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (uploadKeystore != null && uploadKeystore.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

// Gradle Play Publisher — uploads the signed AAB to the Internal testing track.
// Only active in CI (when the service-account JSON is provided via env).
play {
    if (playCredentials != null) {
        serviceAccountCredentials.set(playCredentials)
    }
    track.set("internal")
    defaultToAppBundles.set(true)
    // Don't fail local/test runs that lack credentials; only publish tasks need them.
    enabled.set(playCredentials != null)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.activity.compose)

    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.datastore.preferences)

    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.retrofit)
    testImplementation(libs.retrofit.kotlinx.serialization)
    testImplementation(libs.kotlinx.serialization.json)

    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(composeBom)
    androidTestImplementation(libs.androidx.ui.test.junit4)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
