import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import {
  api,
  ApiError,
  isVerificationRequired,
  reportClientError,
} from "../api/client";
import { StudyCard } from "../api/types";
import { useCardSpeech } from "../speech/useCardSpeech";
import { SpeakButton } from "../speech/SpeakButton";
import { StudyNotice } from "./StudyNotice";

/**
 * Web studies cards by flipping front → back. A branch card (a decision-tree
 * node) has neither: its content is `{ label, prompt, options }`. The study
 * queue returns raw content with no `type` field, so guard on the shape.
 *
 * Filtering here is what makes `StudyCard["content"]`'s front/back true for
 * every card this page renders — without it a branch deck reached by direct URL
 * shows blank cards whose rating buttons write real SM-2 events.
 */
function isFlippable(card: StudyCard): boolean {
  const front = (card.content as { front?: unknown }).front;
  return typeof front === "string" && front.trim() !== "";
}

const RATINGS = [
  { value: 1, labelKey: "again", className: "bg-red-600" },
  { value: 3, labelKey: "hard", className: "bg-amber-600" },
  { value: 4, labelKey: "good", className: "bg-green-600" },
  { value: 5, labelKey: "easy", className: "bg-emerald-600" },
];

export function StudyPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [cards, setCards] = useState<StudyCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [unstudiable, setUnstudiable] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const batch = await api.study.batch(id);
      const flippable = batch.filter(isFlippable);
      // A queue that held cards but nothing flippable is a branching deck. Say
      // so — falling through to the "study complete" screen would be a lie, the
      // same reasoning as the verification gate below.
      setUnstudiable(batch.length > 0 && flippable.length === 0);
      setCards(flippable);
    } catch (err) {
      // The verification gate is an expected refusal, not a failure — surface
      // it to the user but keep it out of the client-error log. Unlike the deck
      // list this keeps the error state: an empty card list would render the
      // "study complete" screen, which would be a lie.
      if (!isVerificationRequired(err)) {
        reportClientError({
          message: err instanceof Error ? err.message : String(err),
          context: "StudyPage.load",
        });
      }
      setError(err instanceof ApiError ? err.message : t("study.loadError"));
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const current = cards && idx < cards.length ? cards[idx] : null;
  const { speech, speakSide, muted, setMuted, cancel, canSpeak } =
    useCardSpeech(id, current?.content ?? null, revealed, idx);

  async function grade(rating: number) {
    if (!cards) return;
    const card = cards[idx];
    cancel();
    try {
      await api.study.review(card.id, rating);
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "StudyPage.grade",
      });
      window.alert(t("study.saveReviewError"));
      return;
    }
    setReviewed((n) => n + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  if (error) {
    return <StudyNotice body={error} tone="error" />;
  }

  if (cards === null) {
    return (
      <p className="p-8 text-center text-gray-500 dark:text-gray-400">
        {t("study.loading")}
      </p>
    );
  }

  if (unstudiable) {
    return (
      <StudyNotice
        title={t("study.branchingTitle")}
        body={t("study.branchingBody")}
      />
    );
  }

  const done = idx >= cards.length;
  if (done) {
    return (
      <StudyNotice
        title={t("study.complete")}
        body={
          reviewed === 0
            ? t("study.nothingDue")
            : t("study.reviewed", { count: reviewed })
        }
      />
    );
  }

  const card = cards[idx];
  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="text-indigo-600">
          {t("study.decks")}
        </Link>
        <div className="flex items-center gap-3">
          {canSpeak && (
            <button
              type="button"
              onClick={() => {
                if (!muted) cancel();
                setMuted(!muted);
              }}
              aria-pressed={muted}
              className="text-indigo-600"
            >
              {muted ? t("study.speech.unmute") : t("study.speech.mute")}
            </button>
          )}
          <span>
            {t("study.progress", { current: idx + 1, total: cards.length })}
          </span>
        </div>
      </div>

      <div className="rounded-xl border p-8 shadow-sm">
        {card.category && (
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {card.category}
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-medium">{card.content.front}</p>
          {speech.frontLang && (
            <SpeakButton
              lang={speech.frontLang}
              onSpeak={() => speakSide("front")}
            />
          )}
        </div>
        {revealed && (
          <div className="mt-6 flex items-start justify-between gap-2 border-t pt-6">
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {card.content.back}
            </p>
            {speech.backLang && (
              <SpeakButton
                lang={speech.backLang}
                onSpeak={() => speakSide("back")}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
          >
            {t("study.showAnswer")}
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => grade(r.value)}
                className={`rounded-lg ${r.className} py-3 text-sm font-medium text-white`}
              >
                {t(`study.${r.labelKey}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {revealed && (
        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          <Trans
            i18nKey="study.ratingHint"
            components={[
              <Link
                key="0"
                to="/help/studying#ratings"
                className="text-indigo-600"
              />,
            ]}
          />
        </p>
      )}
    </div>
  );
}
