# Web i18n (UI internationalization) — Design

**Date:** 2026-06-09
**Scope:** Web app (`packages/web`) only. Android is untouched. Deck content is never translated — only the UI chrome (labels, page text, messages) is.

## Goal

Translate all built-in website text into multiple languages. Ship with **English, German, French, Spanish**; designed to scale to many more by dropping in a new JSON file. The active language is auto-detected on first visit, remembered in `localStorage`, and — for logged-in users — persisted to their account so it follows them across devices.

## Stack

- `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Initialized once in `packages/web/src/i18n/index.ts`, imported from `main.tsx` before `<App>` renders.
- Supported locales: `en`, `de`, `fr`, `es`. Fallback: `en`.

## Locale resolution & sync model

At any moment, **i18next's active language is the single source of truth**. `localStorage` is the cross-session cache; the account `language` field is the cross-device record.

**Resolution order on load (language detector):**

1. `localStorage` key `lang` — if set, it wins.
2. Browser language (`navigator.language`), matched to a supported locale (`de-AT` → `de`), used only when localStorage is empty.
3. Fallback `en`.

**Account sync (logged-in users), layered on top:** the account-stored `language` is authoritative for a logged-in user.

- On **login/signup**: if `r.user.language` is present, call `i18n.changeLanguage()` and write it to `localStorage`.
- On **session restore** (`api.auth.me()` in `AuthContext`): same.
- When a logged-in user **changes language**: `changeLanguage` locally **and** `PATCH /me { language }`.
- A **logged-out** visitor changing the landing/login switcher writes only `localStorage`. If they later log in and the account has a different saved language, the account value wins.

## Translation files

`packages/web/src/i18n/locales/{en,de,fr,es}.json`, one namespaced JSON per language, keyed by page/area. `en.json` is the source of truth; `de/fr/es` mirror its keys.

```json
{
  "common": { "signIn": "Sign in", "save": "Save", "cancel": "Cancel" },
  "landing": {
    "heroTitle": "Learn anything, faster.",
    "signupCta": "Sign up — it's free"
  },
  "settings": { "language": "Language", "theme": "Theme" },
  "auth": {
    "emailLabel": "Email",
    "wrongPassword": "Incorrect email or password"
  }
}
```

- Access via `t("landing.heroTitle")`.
- Interpolation/plurals via i18next, e.g. `t("study.cardsLeft", { count })`.
- All existing hardcoded strings in pages/components are extracted into these files during implementation.

## Backend changes

- **Migration** `packages/server/src/db/migrations/011_user_language.sql`:
  `ALTER TABLE users ADD COLUMN language text;` (nullable; null = no explicit choice → client falls back to browser/localStorage).
- **`auth.repository.ts`**: add `language` to `UserRow` and `USER_COLS`; add `updateLanguage(userId, lang)`.
- **`auth.service.ts`**: extend `updateProfile` to accept an optional `language`; validate it is one of `en|de|fr|es` (reject others so the column can't hold junk); include `language` in the profile DTO returned by `/me`, login, and signup.
- **`PATCH /me`**: already wired — controller passes `req.body.language` through alongside `displayName`.
- **`GET /me`**, login, and signup responses now carry `language`.

## Web client changes

- **`web/src/api/types.ts`**: `User` gains `language: string | null`.
- **`LanguageSwitcher` component**: a styled `<select>` of the 4 languages. Calls a shared `setLanguage(lang, { authed })` helper that does `changeLanguage` + `localStorage`, and when `authed`, `PATCH /me`.
- **Placement**: SettingsPage (next to theme) + a compact variant on the landing and login pages.
- **`AuthContext`**: apply account `language` on login/signup/restore as described in the sync model.
- All visible strings in pages/components swapped to `t(...)`.

## Testing

- **Unit**: locale resolution helper (`localStorage` > browser > fallback; `de-AT` → `de`; unsupported → `en`).
- **Unit**: `setLanguage` calls `PATCH /me` only when authed.
- **Server**: `updateProfile` accepts a valid language, rejects an invalid one; `GET /me` returns it. Extend `auth.routes.test.ts`.
- **Existing page tests** (`CreateDeckPage.test.tsx`, `SettingsPage.test.tsx`, `StudyPage.test.tsx`): update assertions that reference now-translated literals; wrap test renders in an i18n provider initialized to `en`.

## Out of scope

- Android app.
- Translating deck/card content.
- Server-rendered emails (English only for now).
- Locale-aware date/number formatting beyond what already exists.
