import { CsrfToken, OAuthParams } from "./csrf";

// The page a person sees when an AI app asks to connect to their flashkarte
// account. Script-free; every value is HTML-escaped. Step 1 asks for email and
// password; step 2 (only for accounts with two-step verification) asks for the
// authenticator or backup code.

export interface LoginPageView {
  params: OAuthParams;
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

function credentialFields(): string {
  return `<input name="email" type="email" placeholder="Email" autocomplete="username" required>
<input name="password" type="password" placeholder="Password" autocomplete="current-password" required>
<button type="submit">Log in &amp; connect</button>`;
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
</style></head>
<body>
<h1>Connect flashkarte to your AI</h1>
<p>Log in to let your AI create decks in your account.</p>
${view.error ? `<p class="err" role="alert">${escapeHtml(view.error)}</p>` : ""}
<form method="post" action="/oauth/authorize">
${oauthFields(view)}
${fields}
</form>
</body></html>`;
}
