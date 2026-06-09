import i18n from "./index";
import { api } from "../api/client";
import { resolveLocale } from "./resolveLocale";

export async function setLanguage(
  lang: string,
  opts: { authed: boolean },
): Promise<void> {
  const loc = resolveLocale(lang);
  await i18n.changeLanguage(loc);
  try {
    localStorage.setItem("lang", loc);
  } catch {
    // ignore storage failures (private mode etc.)
  }
  if (opts.authed) {
    try {
      await api.auth.updateProfile(undefined, loc);
    } catch {
      // non-fatal: local choice still applied
    }
  }
}
