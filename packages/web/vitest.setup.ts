import "@testing-library/jest-dom";

// Node 26 ships its own experimental `localStorage`/`sessionStorage` globals,
// and its `localStorage` getter returns undefined unless the process was
// started with --localstorage-file. Vitest's jsdom environment copies a window
// key onto the global only when that key is absent from Node's global (or is on
// its internal allowlist, which the storages are not), so on Node 26 the broken
// built-in wins and every `localStorage` call in a test throws
// "Cannot read properties of undefined".
//
// CI runs Node 24, where these globals do not exist and jsdom's storages are
// installed normally. Repointing at the very same jsdom Storage objects makes
// local runs match CI exactly, and is a no-op wherever that already holds.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom
  ?.window;
if (jsdomWindow) {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    if ((globalThis as unknown as Window)[key] !== jsdomWindow[key]) {
      Object.defineProperty(globalThis, key, {
        value: jsdomWindow[key],
        configurable: true,
        writable: true,
        enumerable: true,
      });
    }
  }
}
