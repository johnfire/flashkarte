# flashkarte Phase 1C — Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build `packages/web` — a React + Vite + Tailwind SPA: signup/login, deck list, create/import deck (paste or file with live preview), study flow (flip + 1–5 grade) and per-deck stats — talking to the Phase 1B API, with an ErrorBoundary + window handlers reporting to `/api/client-errors`.

**Architecture:** Vite SPA. A typed `api` client (fetch wrapper) holds the access token in memory and refreshes via the httpOnly cookie. `AuthProvider` gates routes. The shared parser (`@flashkarte/shared`) powers client-side deck preview. Vitest + Testing Library for the critical flows.

**Tech Stack:** React 18, Vite 5, react-router-dom 6, Tailwind 3, Vitest 4, @testing-library/react.

> **Spec:** `…specs/2026-06-04-flashkarte-phase1-mvp-design.md` §8. **Series:** 1A ✅ → 1B ✅ → 1C (this) → 1D deploy.

---

### Task 1: Vite + React + TS + Tailwind + Vitest scaffold

**Files:** `packages/web/{package.json,tsconfig.json,vite.config.ts,index.html,tailwind.config.js,postcss.config.js,vitest.setup.ts}`, `src/{main.tsx,App.tsx,index.css,vite-env.d.ts}`.

- [ ] **Step 1:** `package.json`:

```json
{
  "name": "@flashkarte/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@flashkarte/shared": "0.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2:** `vite.config.ts` — proxy `/api` to `localhost:3001` in dev; vitest jsdom env:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

- [ ] **Step 3:** `vitest.setup.ts`: `import "@testing-library/jest-dom";`

- [ ] **Step 4:** `tsconfig.json` (bundler resolution):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "noEmit": true
  },
  "include": ["src", "vite.config.ts", "vitest.setup.ts"]
}
```

- [ ] **Step 5:** `tailwind.config.js` + `postcss.config.js`:

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

```js
// postcss.config.js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6:** `index.html`, `src/index.css` (Tailwind directives), `src/vite-env.d.ts` (`/// <reference types="vite/client" />`), minimal `src/main.tsx` + `src/App.tsx` (placeholder "flashkarte").

- [ ] **Step 7:** `npm install` at root. Then `npm run build --workspace=packages/web` and `npm test --workspace=packages/web` (no tests yet → vitest passes with "no tests"). Commit: `chore(web): vite+react+tailwind+vitest scaffold`.

---

### Task 2: Types + API client

**Files:** `src/api/types.ts`, `src/api/client.ts`, test `src/api/client.test.ts`.

- [ ] **Step 1:** `types.ts` — `User`, `Deck`, `DeckWithCounts`, `Card`, `DeckDetail`, `StudyCard`, `ReviewResult`, `DeckStats`.

```ts
export interface User {
  id: string;
  email: string;
  role: string;
}
export interface DeckWithCounts {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  card_count: string;
  due_count: string;
}
export interface Card {
  id: string;
  type: string;
  content: { front: string; back: string };
  category: string | null;
  position: number;
}
export interface DeckDetail {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  cards: Card[];
}
export interface StudyCard {
  id: string;
  content: { front: string; back: string };
  category: string | null;
}
export interface ReviewResult {
  card_id: string;
  easiness: number;
  interval: number;
  repetitions: number;
  due_at: string;
}
export interface DeckStats {
  total: number;
  new: number;
  due: number;
  learned: number;
}
```

- [ ] **Step 2:** `client.ts` — token in memory; `request<T>` attaches Bearer + credentials, throws `ApiError {status, code, message}` on !ok; one transparent refresh-and-retry on 401; `reportClientError` via bare fetch; typed endpoint methods (`auth.signup/login/logout`, `decks.list/get/create/createFromFile/rename/remove`, `study.batch/review/stats`).

```ts
import {
  User,
  DeckWithCounts,
  DeckDetail,
  StudyCard,
  ReviewResult,
  DeckStats,
} from "./types";

const APP_VERSION = "0.1.0";
let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function raw(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (!(opts.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`/api${path}`, { ...opts, headers, credentials: "include" });
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshed = await raw("/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      const { accessToken: tok } = await refreshed.json();
      setAccessToken(tok);
      res = await raw(path, opts);
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? "ERROR",
      body?.error?.message ?? `HTTP ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function reportClientError(r: {
  message: string;
  context?: string;
  stack?: string;
}) {
  try {
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        app: "web",
        appVersion: APP_VERSION,
        platform: "web",
        url: typeof location !== "undefined" ? location.href : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ...r,
      }),
    }).catch(() => {});
  } catch {
    /* never throws */
  }
}

export const api = {
  auth: {
    signup: (email: string, password: string) =>
      request<{ user: User; accessToken: string; expiresIn: number }>(
        "/auth/signup",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      ),
    login: (email: string, password: string) =>
      request<{ user: User; accessToken: string; expiresIn: number }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      ),
    refresh: () =>
      request<{ accessToken: string }>("/auth/refresh", { method: "POST" }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
  },
  decks: {
    list: () => request<DeckWithCounts[]>("/decks"),
    get: (id: string) => request<DeckDetail>(`/decks/${id}`),
    create: (markdown: string, title?: string) =>
      request<{ id: string; title: string; card_count: number }>("/decks", {
        method: "POST",
        body: JSON.stringify({ markdown, title }),
      }),
    createFromFile: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return request<{ id: string; title: string; card_count: number }>(
        "/decks",
        {
          method: "POST",
          body: fd,
        },
      );
    },
    rename: (id: string, title: string) =>
      request<DeckWithCounts>(`/decks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    remove: (id: string) => request<void>(`/decks/${id}`, { method: "DELETE" }),
  },
  study: {
    batch: (deckId: string) => request<StudyCard[]>(`/decks/${deckId}/study`),
    stats: (deckId: string) => request<DeckStats>(`/decks/${deckId}/stats`),
    review: (cardId: string, rating: number) =>
      request<ReviewResult>("/study/review", {
        method: "POST",
        body: JSON.stringify({ card_id: cardId, rating }),
      }),
  },
};
```

- [ ] **Step 3:** `client.test.ts` — mock `global.fetch`: (a) GET attaches Bearer + parses JSON; (b) 401 then refresh-retry succeeds; (c) non-ok maps to `ApiError` with code. Run `npm test --workspace=packages/web` until green.

- [ ] **Step 4:** Commit: `feat(web): typed API client + client-error reporter`.

---

### Task 3: Auth context

**Files:** `src/auth/AuthContext.tsx`, test `src/auth/AuthContext.test.tsx`.

- [ ] **Step 1:** `AuthContext.tsx` — `AuthProvider` with `{ user, loading, login, signup, logout }`. On mount, try `api.auth.refresh()`; if ok set token + fetch is skipped (we store the user from login/signup; on cold refresh we mark authenticated with a minimal user via a `/decks` probe is overkill — instead keep `user` null but `authenticated` true). Simpler: store `user` in state set by login/signup; on mount attempt refresh, on success set `authed=true`. Expose `useAuth()`.

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api, setAccessToken } from "../api/client";
import { User } from "../api/types";

interface AuthValue {
  user: User | null;
  authed: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .refresh()
      .then((r) => {
        setAccessToken(r.accessToken);
        setAuthed(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.auth.login(email, password);
    setAccessToken(r.accessToken);
    setUser(r.user);
    setAuthed(true);
  };
  const signup = async (email: string, password: string) => {
    const r = await api.auth.signup(email, password);
    setAccessToken(r.accessToken);
    setUser(r.user);
    setAuthed(true);
  };
  const logout = async () => {
    await api.auth.logout().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setAuthed(false);
  };

  return (
    <Ctx.Provider value={{ user, authed, loading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
```

- [ ] **Step 2:** Test: mock `api`; `login()` sets `authed` true. Run until green.

- [ ] **Step 3:** Commit: `feat(web): auth context`.

---

### Task 4: ErrorBoundary + window handlers + entry wiring

**Files:** `src/components/ErrorBoundary.tsx`, `src/main.tsx`.

- [ ] **Step 1:** `ErrorBoundary.tsx` — class boundary; `componentDidCatch` → `reportClientError`; fallback with Reload. (Same shape as notes-world.)

- [ ] **Step 2:** `main.tsx` — register `window` `error` + `unhandledrejection` → `reportClientError`; render `<ErrorBoundary><BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter></ErrorBoundary>`.

- [ ] **Step 3:** Commit: `feat(web): error boundary + global error reporting`.

---

### Task 5: Router, pages, study flow

**Files:** `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/{AuthPage,DeckListPage,CreateDeckPage,StudyPage}.tsx`, tests `CreateDeckPage.test.tsx`, `StudyPage.test.tsx`.

- [ ] **Step 1:** `ProtectedRoute.tsx` — uses `useAuth`; while `loading` show spinner; if `!authed` `<Navigate to="/login" />`; else `<Outlet/>`.

- [ ] **Step 2:** `App.tsx` routes: `/login` (`AuthPage`), protected `/` (`DeckListPage`), `/decks/new` (`CreateDeckPage`), `/decks/:id/study` (`StudyPage`).

- [ ] **Step 3:** `AuthPage.tsx` — toggle login/signup; email + password; on submit call `useAuth().login/signup`; show ApiError message; navigate to `/` on success.

- [ ] **Step 4:** `DeckListPage.tsx` — `useEffect` load `api.decks.list()`; show title + due_count/card_count; "New deck" → `/decks/new`; "Study" → `/decks/:id/study`; delete with confirm; error + empty states (no false-empty).

- [ ] **Step 5:** `CreateDeckPage.tsx` — textarea (paste) + file input; live preview via `parseDeck` from `@flashkarte/shared` (card count + first fronts); disable save if 0 cards; save → `api.decks.create` / `createFromFile` → navigate to list; format help text. Test: typing valid markdown shows "3 cards"; zero-card markdown disables save.

- [ ] **Step 6:** `StudyPage.tsx` — load `api.study.batch`; show front → "Show answer" → reveal back + 1–5 grade buttons; on grade call `api.study.review`, advance; session summary when batch empty; error state. Test: render with mocked batch of 1 card; click Show answer reveals back; clicking a grade calls `api.study.review` with the rating.

- [ ] **Step 7:** Run `npm test --workspace=packages/web` (all green) and `npm run build --workspace=packages/web` (typechecks + builds). Commit: `feat(web): router + auth/deck/create/study pages`.

---

## Self-Review Notes

- **Spec coverage:** §8 screens (auth, deck list, create/import with preview, study flow with 1–5 grade, stats), §9 ErrorBoundary + window reporting → `/api/client-errors`. Client-side preview reuses the shared parser (single source of truth).
- **Consistency:** `api` method names, `ApiError`, `useAuth`, `reportClientError`, `setAccessToken`, `parseDeck` used consistently across tasks. Token in memory + cookie refresh matches the 1B auth contract (`fk_refresh` cookie, `/api/auth/refresh`).
- **Deferred:** styling is functional Tailwind, not polished design (UX polish is a later pass); stats shown inline on deck list/study summary rather than a dedicated analytics page.
