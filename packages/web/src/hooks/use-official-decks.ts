import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, isVerificationRequired, reportClientError } from "../api/client";
import { OfficialDeck } from "../api/types";
import { useAsync } from "./use-async";

/**
 * The "browse official decks" list plus the subscribe action that moves one
 * into the caller's own deck list. Split out of DeckListPage to keep that
 * component's line count in check.
 */
export function useOfficialDecks(
  verified: boolean,
  reloadDecks: () => Promise<void>,
) {
  const { t } = useTranslation();
  const loadOfficial = useCallback(async () => {
    if (!verified) return [];
    try {
      return await api.decks.listOfficial();
    } catch (err) {
      if (isVerificationRequired(err)) return [];
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "useOfficialDecks.load",
      });
      throw err;
    }
  }, [verified]);
  const {
    data: officialDecks,
    error: officialLoadError,
    reload: reloadOfficial,
    setData: setOfficialDecks,
  } = useAsync<OfficialDeck[], []>(loadOfficial, []);

  const [subscribing, setSubscribing] = useState<string | null>(null);

  async function onSubscribe(id: string) {
    setSubscribing(id);
    try {
      await api.decks.subscribe(id);
      setOfficialDecks((list) => list?.filter((d) => d.id !== id) ?? list);
      await reloadDecks();
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "useOfficialDecks.onSubscribe",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setSubscribing(null);
    }
  }

  return {
    officialDecks,
    officialLoadError,
    reloadOfficial,
    subscribing,
    onSubscribe,
  };
}
