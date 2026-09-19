import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type {
  LessonAnswerResponse,
  LessonStep,
  LessonSummary,
} from "../api/learn-types";

const messageOf = (error: unknown): string =>
  error instanceof ApiError ? error.message : "Something went wrong";

/** What the learner just answered, kept on screen until they choose to go on. */
export interface Feedback {
  question: Extract<LessonStep, { kind: "question" }>;
  response: LessonAnswerResponse;
}

interface Run {
  lesson: LessonSummary | null;
  step: LessonStep | null;
  feedback: Feedback | null;
  /** Lessons the pass just opened, for the "passed" screen. */
  unlocked: { slug: string; title: string }[];
  busy: boolean;
  error: string | null;
}

/**
 * One learner's run through a lesson. The server holds the state and the rules; this only shows
 * the current step and sends what the learner did. After an answer the reply already contains the
 * next step, but it is held back until the learner has read the reasons and chosen to continue.
 */
export function useLessonRun(subjectId: string, slug: string) {
  const [run, setRun] = useState<Run>({
    lesson: null,
    step: null,
    feedback: null,
    unlocked: [],
    busy: true,
    error: null,
  });
  const latest = useRef(0);

  const perform = useCallback(
    async (
      action: () => Promise<{ lesson: LessonSummary; step: LessonStep }>,
    ) => {
      const version = ++latest.current;
      setRun((current) => ({ ...current, busy: true, error: null }));
      try {
        const reply = await action();
        if (version !== latest.current) return;
        setRun((current) => ({
          ...current,
          lesson: reply.lesson,
          step: reply.step,
          feedback: null,
          busy: false,
          error: null,
        }));
      } catch (error) {
        if (version !== latest.current) return;
        setRun((current) => ({
          ...current,
          busy: false,
          error: messageOf(error),
        }));
      }
    },
    [],
  );

  useEffect(() => {
    void perform(() => api.learn.start(subjectId, slug));
    return () => {
      latest.current += 1;
    };
  }, [perform, subjectId, slug]);

  const answer = useCallback(
    async (choice: number) => {
      const question = run.step;
      if (question?.kind !== "question") return;
      const version = ++latest.current;
      setRun((current) => ({ ...current, busy: true, error: null }));
      try {
        const response = await api.learn.answer(subjectId, slug, choice);
        if (version !== latest.current) return;
        setRun((current) => ({
          ...current,
          lesson: response.lesson,
          feedback: { question, response },
          unlocked: response.passed ? response.unlocked : current.unlocked,
          busy: false,
        }));
      } catch (error) {
        if (version !== latest.current) return;
        setRun((current) => ({
          ...current,
          busy: false,
          error: messageOf(error),
        }));
      }
    },
    [run.step, subjectId, slug],
  );

  const afterFeedback = useCallback(() => {
    setRun((current) =>
      current.feedback
        ? {
            ...current,
            step: current.feedback.response.step,
            feedback: null,
          }
        : current,
    );
  }, []);

  return {
    ...run,
    answer,
    afterFeedback,
    next: () => perform(() => api.learn.next(subjectId, slug)),
    back: () => perform(() => api.learn.back(subjectId, slug)),
    carryOn: () => perform(() => api.learn.carryOn(subjectId, slug)),
    pause: () => perform(() => api.learn.pause(subjectId, slug)),
    resume: () => perform(() => api.learn.start(subjectId, slug)),
  };
}
