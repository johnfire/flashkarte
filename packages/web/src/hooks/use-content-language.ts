import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ContentLanguageChoice } from "../components/ContentLanguageSwitcher";

const CHOICES: ContentLanguageChoice[] = ["all", "en", "de", "ar"];
type ContentPage = "library" | "courses" | "decks";

function validChoice(value: string | null): ContentLanguageChoice | null {
  return CHOICES.find((choice) => choice === value) ?? null;
}

export function useContentLanguage(page: ContentPage) {
  const { user } = useAuth();
  const userId = user?.id;
  const isVerified = Boolean(user?.emailVerifiedAt);
  const [searchParams, setSearchParams] = useSearchParams();
  const explicit = validChoice(searchParams.get("language"));
  const [saved, setSaved] = useState<ContentLanguageChoice>("all");

  useEffect(() => {
    if (!userId || !isVerified) return;
    let active = true;
    void api.contentLanguages
      .list()
      .then((preferences) => {
        if (active) setSaved(validChoice(preferences[page] ?? null) ?? "all");
      })
      .catch(() => {
        /* The URL and All remain usable if preferences are unavailable. */
      });
    return () => {
      active = false;
    };
  }, [page, userId, isVerified]);

  function choose(language: ContentLanguageChoice) {
    const next = new URLSearchParams(searchParams);
    next.set("language", language);
    setSearchParams(next);
    setSaved(language);
    if (userId && isVerified)
      void api.contentLanguages.save(page, language).catch(() => {});
  }

  return { language: explicit ?? saved, choose };
}
