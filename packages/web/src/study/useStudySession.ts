import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  ApiError,
  isVerificationRequired,
  reportClientError,
} from "../api/client";
import { StudyCard, Card } from "../api/types";
import {
  promptFor,
  selectOptions,
  type ParsedCard,
  type StudyOption,
} from "@flashkarte/shared";
import { useCardSpeech } from "../speech/useCardSpeech";
import { useStudyMode } from "./useStudyMode";

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

/** A lesson (reading card): read and acknowledged, never rated or scheduled. */
function isLesson(card: StudyCard): boolean {
  return card.type === "read";
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

/**
 * Adapt a study card to the shape `selectOptions` expects. Every card this
 * page renders is `isFlippable`, i.e. an ordinary or diagnostic "basic" card
 * — never a branch card — so `type: "basic"` always holds here.
 */
function toParsedCard(card: StudyCard): ParsedCard {
  return {
    type: "basic",
    front: card.content.front,
    back: card.content.back,
    category: card.category,
    label: card.content.label ?? null,
    options: card.content.options ?? [],
    sense: card.content.sense ?? null,
    senseConflict: false,
  };
}

/** Ratings below this are lapses: the card comes back before the session ends. */
const LAPSE_CEILING = 3;

/**
 * All state and behavior for a study session: loading the queue, Flip-mode
 * grading, Choice-mode picking with diagnostic remediation interludes (Spec
 * 01/08), and speech. `StudyPage` is pure rendering over this hook's return.
 */
export function useStudySession(deckId: string | undefined) {
  const { t } = useTranslation();
  const { mode, setMode } = useStudyMode();
  const [cards, setCards] = useState<StudyCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Distinct cards, not reviews: a lapsed card is re-queued and rated again in
  // the same session, and "reviewed 12 cards" must not count it twice.
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  // Lessons read this session: not reviews, so they are counted apart.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [unstudiable, setUnstudiable] = useState(false);

  // Choice mode: options for the current card, the learner's pick (revealed
  // but not yet graded), and — for a wrong routed diagnostic pick — the
  // remediation card shown as a no-grade interlude before advancing.
  const [sessionPool, setSessionPool] = useState<string[]>([]);
  const [options, setOptions] = useState<StudyOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<StudyOption | null>(
    null,
  );
  const [deckCards, setDeckCards] = useState<Card[] | null>(null);
  const [remediation, setRemediation] = useState<Card | null>(null);

  const load = useCallback(async () => {
    if (!deckId) return;
    setError(null);
    try {
      const batch = await api.study.batch(deckId);
      const flippable = batch.filter(isFlippable);
      // A queue that held cards but nothing flippable is a branching deck. Say
      // so — falling through to the "study complete" screen would be a lie, the
      // same reasoning as the verification gate below.
      setUnstudiable(batch.length > 0 && flippable.length === 0);
      setCards(flippable);
      // Distractors come from real answers; a lesson body is not one.
      setSessionPool(
        flippable.filter((c) => !isLesson(c)).map((c) => c.content.back),
      );

      // Diagnostic cards' remediation targets are ordinary cards elsewhere in
      // the deck (Spec 01). The study batch only carries due cards, so fetch
      // the full deck once, lazily, only when there's something to resolve.
      const hasDiagnostic = flippable.some(
        (c) => (c.content.options?.length ?? 0) > 0,
      );
      if (hasDiagnostic) {
        try {
          const detail = await api.decks.get(deckId);
          setDeckCards(detail.cards);
        } catch (err) {
          reportClientError({
            message: err instanceof Error ? err.message : String(err),
            context: "StudyPage.loadDeckCards",
          });
        }
      }
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
  }, [deckId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const current = cards && idx < cards.length ? cards[idx] : null;
  // Speech reads the prompt, not the raw headword, so a graduated sense is spoken
  // as its whole context sentence. Memoised because the hook's autoplay effects
  // depend on this object's identity — a fresh one each render would re-speak.
  const spoken = useMemo(
    () =>
      current && !isLesson(current)
        ? { front: cardPrompt(current), back: current.content.back }
        : null,
    [current],
  );
  const {
    speech: speechInfo,
    speakSide,
    muted,
    setMuted,
    cancel,
    canSpeak,
  } = useCardSpeech(deckId, spoken, revealed, idx);

  // Rebuild Choice-mode options whenever the current card or mode changes —
  // not on every render, so a re-render mid-pick (e.g. a speech state change)
  // doesn't reshuffle the options out from under the learner's selection.
  useEffect(() => {
    if (!current || isLesson(current) || mode !== "choice") {
      setOptions([]);
      setSelectedOption(null);
      return;
    }
    setOptions(selectOptions(toParsedCard(current), sessionPool));
    setSelectedOption(null);
    // sessionPool is fixed for the session; current is tracked by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, mode]);

  const findRemediation = useCallback(
    (label: string): Card | null =>
      deckCards?.find((c) => c.content.label === label) ?? null,
    [deckCards],
  );

  /** Shared tail of grading: write the review, track it as reviewed, requeue
   *  on a lapse. Returns whether it succeeded, so callers can decide what to
   *  do next (advance immediately, or show a remediation interlude first). */
  const submitRating = useCallback(
    async (card: StudyCard, rating: number, optionIndex?: number) => {
      cancel();
      try {
        await api.study.review(card.id, rating, optionIndex);
      } catch (err) {
        reportClientError({
          message: err instanceof Error ? err.message : String(err),
          context: "StudyPage.grade",
        });
        window.alert(t("study.saveReviewError"));
        return false;
      }
      setReviewedIds((seen) => new Set(seen).add(card.id));
      if (rating < LAPSE_CEILING) {
        setCards((queue) => (queue ? [...queue, card] : queue));
      }
      return true;
    },
    [cancel, t],
  );

  async function grade(rating: number) {
    if (!cards) return;
    const card = cards[idx];
    const ok = await submitRating(card, rating);
    if (!ok) return;
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  /**
   * "Got it" on a lesson. Fails open: the read is best-effort, so a network error
   * is reported and the learner moves on (the lesson is offered again next time)
   * instead of being stuck on a screen that only asks them to continue.
   */
  async function markRead() {
    if (!cards) return;
    const card = cards[idx];
    try {
      await api.study.markRead(card.id);
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "StudyPage.markRead",
      });
    }
    setReadIds((seen) => new Set(seen).add(card.id));
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  function chooseAnswer(option: StudyOption) {
    if (selectedOption) return;
    setSelectedOption(option);
  }

  async function continueChoice() {
    if (!cards || !selectedOption) return;
    const card = cards[idx];
    const rating = selectedOption.correct ? 4 : 1;
    const ok = await submitRating(
      card,
      rating,
      selectedOption.optionIndex ?? undefined,
    );
    if (!ok) return;

    const label = selectedOption.remediationLabel;
    const target = label ? findRemediation(label) : null;
    if (label && !target) {
      // Fails open: the pick was already graded above, so a missing/failed
      // remediation lookup just skips the interlude rather than blocking study.
      reportClientError({
        message: `remediation card not found for label "${label}"`,
        context: "StudyPage.continueChoice",
      });
    }
    if (target) {
      setRemediation(target);
      return;
    }
    setIdx((i) => i + 1);
  }

  function dismissRemediation() {
    setRemediation(null);
    setIdx((i) => i + 1);
  }

  // Choice-mode keyboard shortcuts: digits pick an option before answering,
  // Space/Enter advances afterward (or dismisses a remediation interlude).
  useEffect(() => {
    if (!current) return;
    const onLesson = isLesson(current);
    if (mode !== "choice" && !onLesson) return;
    function onKeyDown(e: KeyboardEvent) {
      if (onLesson) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          markRead();
        }
        return;
      }
      if (remediation) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          dismissRemediation();
        }
        return;
      }
      if (!selectedOption) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= options.length) {
          chooseAnswer(options[n - 1]);
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        continueChoice();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current?.id, remediation, selectedOption, options]);

  return {
    error,
    loading: cards === null,
    unstudiable,
    cards,
    idx,
    current,
    promptText: current ? cardPrompt(current) : "",
    done: cards !== null && idx >= cards.length,
    reviewedCount: reviewedIds.size,
    readCount: readIds.size,
    isReading: current ? isLesson(current) : false,
    markRead,
    revealed,
    reveal: () => setRevealed(true),
    grade,
    speech: speechInfo,
    speakSide,
    muted,
    setMuted,
    cancel,
    canSpeak,
    mode,
    setMode,
    options,
    selectedOption,
    chooseAnswer,
    continueChoice,
    remediation,
    dismissRemediation,
  };
}
