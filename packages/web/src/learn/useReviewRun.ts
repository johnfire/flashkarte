import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type {
  DueReviews,
  ReviewAnswerResponse,
  ReviewStep,
} from "../api/learn-types";

export interface ReviewFeedback {
  question: Extract<ReviewStep, { kind: "question" }>;
  response: ReviewAnswerResponse;
}

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : "Something went wrong";

/**
 * Works through the questions that are due, one at a time: each is asked alone, a miss re-teaches
 * its screens and asks again, and the first try sets when it comes back.
 */
export function useReviewRun(subjectId: string) {
  const [due, setDue] = useState<DueReviews | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [step, setStep] = useState<ReviewStep | null>(null);
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const begin = useCallback(async () => {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const list = await api.learn.reviews(subjectId);
      if (!alive.current) return;
      setDue(list);
      const first = list.due[0];
      if (!first) {
        setQuestionId(null);
        setStep(null);
      } else {
        const started = await api.learn.startReview(
          subjectId,
          first.question_id,
        );
        if (!alive.current) return;
        setQuestionId(first.question_id);
        setStep(started.step);
      }
    } catch (failure) {
      if (alive.current) setError(messageOf(failure));
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [subjectId]);

  useEffect(() => {
    alive.current = true;
    void begin();
    return () => {
      alive.current = false;
    };
  }, [begin]);

  const guard = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  }, []);

  const answer = (choice: number) =>
    guard(async () => {
      if (step?.kind !== "question" || !questionId) return;
      const response = await api.learn.answerReview(
        subjectId,
        questionId,
        choice,
      );
      setFeedback({ question: step, response });
    });

  const afterFeedback = () => {
    if (!feedback) return;
    setStep(feedback.response.step);
    setFeedback(null);
  };

  const carryOn = () =>
    guard(async () => {
      if (!questionId) return;
      setStep((await api.learn.carryOnReview(subjectId, questionId)).step);
    });

  return {
    due,
    step,
    feedback,
    busy,
    error,
    answer,
    afterFeedback,
    carryOn,
    next: begin,
  };
}
