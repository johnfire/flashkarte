import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { DeckWithCounts } from "../api/types";
import { DeckSpeechDialog } from "./DeckSpeechDialog";

interface DeckListItemProps {
  deck: DeckWithCounts;
  onTogglePublic: (id: string, makePublic: boolean) => void;
  onDelete: (id: string, title: string) => void;
}

export function DeckListItem({
  deck: d,
  onTogglePublic,
  onDelete,
}: DeckListItemProps) {
  const { t } = useTranslation();
  const [speechOpen, setSpeechOpen] = useState(false);
  return (
    <li className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">
          {d.title}
          {d.is_public && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {t("decks.public")}
            </span>
          )}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("decks.cardCount", { count: d.card_count })} ·{" "}
          {t("decks.dueCount", { count: d.due_count })}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {t("decks.viewed", { count: d.viewed_count })}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {t("decks.new", { count: d.new_count })}
          </span>
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-900/40 dark:text-red-300">
            {t("decks.again", { count: d.again_count })}
          </span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {t("decks.hard", { count: d.hard_count })}
          </span>
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/40 dark:text-green-300">
            {t("decks.good", { count: d.good_count })}
          </span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {t("decks.easy", { count: d.easy_count })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {d.is_branching ? (
          // Branching decks are played as a decision tree, which only the
          // Android app implements. Their branch cards have no front/back, so
          // offering Study here would render blank cards and write SM-2 review
          // events against scenario nodes.
          <span
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            title={t("decks.branchingHint")}
          >
            {t("decks.branching")}
          </span>
        ) : (
          <Link
            to={`/decks/${d.id}/study`}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            {t("decks.study")}
          </Link>
        )}
        <button
          onClick={() => onTogglePublic(d.id, !d.is_public)}
          className="text-sm text-indigo-600"
          title={d.is_public ? t("decks.unshareTitle") : t("decks.shareTitle")}
        >
          {d.is_public ? t("decks.unshare") : t("decks.share")}
        </button>
        <button
          onClick={() => setSpeechOpen(true)}
          className="text-sm text-indigo-600"
          title={t("decks.speech.openTitle")}
        >
          {t("decks.speech.open")}
        </button>
        <button
          onClick={() => onDelete(d.id, d.title)}
          className="text-sm text-red-600"
        >
          {t("decks.delete")}
        </button>
      </div>
      {speechOpen && (
        <DeckSpeechDialog
          deckId={d.id}
          deckTitle={d.title}
          onClose={() => setSpeechOpen(false)}
        />
      )}
    </li>
  );
}
