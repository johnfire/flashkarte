import { CsrfToken, OAuthParams } from "./csrf";

// The page a person sees when an AI app asks to connect to their flashkarte
// account. It names the app and where the person will be sent afterwards, so a
// phishing link that borrows the real login page shows itself for what it is.
// Script-free; every value is HTML-escaped. Step 1 asks for email and
// password; step 2 (only for accounts with two-step verification) asks for the
// authenticator or backup code.

export interface ConnectingApp {
  name: string;
  /** True when the name comes from the app's own registration, unverified. */
  isSelfRegistered: boolean;
}

export interface LoginPageView {
  params: OAuthParams;
  app: ConnectingApp;
  csrf: CsrfToken;
  error?: string;
  /** Present on step 2: the backend's short-lived 2FA challenge. */
  challenge?: string;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function hidden(name: string, value?: string): string {
  return value
    ? `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`
    : "";
}

function oauthFields(view: LoginPageView): string {
  const p = view.params;
  return [
    hidden("response_type", "code"),
    hidden("client_id", p.client_id),
    hidden("redirect_uri", p.redirect_uri),
    hidden("code_challenge", p.code_challenge),
    hidden("code_challenge_method", p.code_challenge_method),
    hidden("state", p.state),
    hidden("csrf_ts", view.csrf.ts),
    hidden("csrf_sig", view.csrf.sig),
  ].join("\n");
}

/** Where the code goes: a host name, or "this computer" for a loopback app. */
export function redirectDestination(redirectUri: string): string {
  const host = new URL(redirectUri).hostname;
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(host);
  return isLoopback ? "an app on this computer (localhost)" : host;
}

function consentText(view: LoginPageView): string {
  const selfNamed = view.app.isSelfRegistered
    ? `<p class="note">The app chose this name itself; flashkarte has not checked it.</p>`
    : "";
  return `<h1>Allow <strong>${escapeHtml(view.app.name)}</strong> to use your flashkarte account?</h1>
${selfNamed}
<p>It will be able to read, create, change and delete your decks, cards, courses, subjects and lessons, and see your study progress.</p>
<p>It cannot see or change your email, password or two-step verification, create API keys, export your data or delete your account.</p>
<p class="note">After you log in you will be sent to <strong>${escapeHtml(redirectDestination(view.params.redirect_uri))}</strong>. Only continue if you started this connection yourself. You can disconnect it at any time under Settings → Connect your AI.</p>`;
}

function credentialFields(): string {
  return `<input name="email" type="email" placeholder="Email" autocomplete="username" required>
<input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Allow and connect</button>`;
}

function twoFactorFields(challenge: string): string {
  return `${hidden("challenge", challenge)}
<p>Your account uses two-step verification. Enter the 6-digit code from your authenticator app, or a backup code.</p>
<input name="code" placeholder="Code" autocomplete="one-time-code" inputmode="numeric" required autofocus>
<button type="submit">Verify &amp; connect</button>`;
}

export function renderLoginPage(view: LoginPageView): string {
  const fields = view.challenge
    ? twoFactorFields(view.challenge)
    : credentialFields();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Connect flashkarte</title>
<style>
body{font-family:system-ui,sans-serif;max-width:22rem;margin:4rem auto;padding:0 1rem}
input{display:block;width:100%;padding:.6rem;margin:.4rem 0;box-sizing:border-box}
button{padding:.65rem 1rem;width:100%;cursor:pointer}
.err{color:#b00020}
.note{color:#555;font-size:.9rem}
</style></head>
<body>
${consentText(view)}
${view.error ? `<p class="err" role="alert">${escapeHtml(view.error)}</p>` : ""}
<form method="post" action="/oauth/authorize">
${oauthFields(view)}
${fields}
</form>
</body></html>`;
}
