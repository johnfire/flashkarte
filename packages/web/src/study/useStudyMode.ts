import { useCallback, useState } from "react";

export type StudyMode = "flip" | "choice";

const KEY = "flashkarte_study_mode";

function read(): StudyMode {
  try {
    return localStorage.getItem(KEY) === "choice" ? "choice" : "flip";
  } catch {
    return "flip";
  }
}

/**
 * Per-device study mode preference (Flip vs. Choice), localStorage-backed --
 * mirrors Android's per-device StudyModeStore. No server sync: there is
 * nothing cross-device to reconcile, same as `theme/useTheme.ts`.
 */
export function useStudyMode() {
  const [mode, setModeState] = useState<StudyMode>(read);
  const setMode = useCallback((next: StudyMode) => {
    setModeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }, []);
  return { mode, setMode };
}
