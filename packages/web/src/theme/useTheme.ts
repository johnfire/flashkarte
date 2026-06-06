import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// The <html> "dark" class is the single source of truth (set pre-paint by the
// inline script in index.html). All consumers subscribe to the same external
// store, so a change from one control (e.g. the floating toggle) is reflected
// everywhere (e.g. the Settings selection) without a reload.
function read(): Theme {
  return typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

const listeners = new Set<() => void>();

function apply(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("theme", next);
  } catch {
    // ignore storage failures (private mode etc.)
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, read);
  return {
    theme,
    setTheme: apply,
    toggle: () => apply(read() === "dark" ? "light" : "dark"),
  };
}
