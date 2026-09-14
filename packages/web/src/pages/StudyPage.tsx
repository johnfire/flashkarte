import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  api,
  ApiError,
  isVerificationRequired,
  reportClientError,
} from "../api/client";
import { StudyCard } from "../api/types";
import { promptFor } from "@flashkarte/shared";
import { useCardSpeech } from "../speech/useCardSpeech";
import { SpeakButton } from "../speech/SpeakButton";
import { StudyNotice } from "./StudyNotice";
import { StudyControls } from "./StudyControls";
import { CardText } from "../components/CardText";

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

/**
 * What a card asks. A sense card (Spec 10) is prompted by its hint while its word is
 * still chained and by its context sentence once the word has graduated; the phase is
 * decided server-side, since only the server sees every sense's progress.
 */
function cardPrompt(card: StudyCard): string {
  return promptFor(
    { front: card.content.front, sense: card.content.sense ?? null },
    card.phase ?? "split",
  );
}

/** Ratings below this are lapses: the card comes back before the session ends. */
const LAPSE_CEILING = 3;

export function StudyPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [cards, setCards] = useState<StudyCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Distinct cards, not reviews: a lapsed card is re-queued and rated again in
  // the same session, and "reviewed 12 cards" must not count it twice.
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
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
  // Speech reads the prompt, not the raw headword, so a graduated sense is spoken
  // as its whole context sentence. Memoised because the hook's autoplay effects
  // depend on this object's identity — a fresh one each render would re-speak.
  const spoken = useMemo(
    () =>
      current
        ? { front: cardPrompt(current), back: current.content.back }
        : null,
    [current],
  );
  const { speech, speakSide, muted, setMuted, cancel, canSpeak } =
    useCardSpeech(id, spoken, revealed, idx);

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
    setReviewedIds((seen) => new Set(seen).add(card.id));
    setRevealed(false);
    // A lapse goes to the back of the queue so it is drilled again now; the
    // server has already scheduled it for tomorrow either way.
    if (rating < LAPSE_CEILING) {
      setCards((queue) => (queue ? [...queue, card] : queue));
    }
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
          reviewedIds.size === 0
            ? t("study.nothingDue")
            : t("study.reviewed", { count: reviewedIds.size })
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
          <p className="text-lg font-medium">
            <CardText text={cardPrompt(card)} />
          </p>
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
              <CardText text={card.content.back} />
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

      <StudyControls
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onGrade={grade}
      />
    </div>
  );
}
