import { NotFoundError } from "../../utils/errors";
import * as repo from "./account.repository";

export interface AccountExport {
  exportedAt: string;
  profile: {
    email: string;
    displayName: string | null;
    role: string;
    accountType: string;
    language: string | null;
    speech: {
      enabled: boolean;
      lang: string | null;
      autoplay: string;
      rate: number;
    };
    emailVerifiedAt: string | null;
    createdAt: string;
  };
  decks: Array<{
    id: string;
    title: string;
    sourceFilename: string | null;
    isPublic: boolean;
    isOrdered: boolean;
    speech: {
      enabled: boolean | null;
      frontLang: string | null;
      backLang: string | null;
      autoplay: string | null;
      rate: number | null;
    };
    createdAt: string;
    updatedAt: string;
    cards: Array<{
      id: string;
      type: string;
      content: unknown;
      category: string | null;
      position: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
  cardProgress: Array<{
    cardId: string;
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: string;
    lastReviewedAt: string | null;
    lastRating: number | null;
  }>;
  reviewEvents: Array<{
    eventId: string;
    cardId: string;
    rating: number;
    reviewedAt: string;
    optionIndex: number | null;
    createdAt: string;
  }>;
  cardReads: Array<{ cardId: string; readAt: string }>;
  lessonContent: {
    modules: Array<{
      id: string;
      subjectId: string;
      title: string;
      position: number;
    }>;
    lessons: Array<{
      subjectId: string;
      moduleId: string | null;
      slug: string;
      title: string;
      summary: string;
      stage: string;
      position: number;
      covers: string[];
      prerequisites: Array<{ from: string; reason: string }>;
    }>;
    screens: Array<{
      subjectId: string;
      lesson: string;
      number: string;
      blocks: unknown;
      authorKind: string;
      sources: unknown;
      retired: boolean;
      revisions: Array<{ change: string; changedAt: string; blocks: unknown }>;
    }>;
    assets: Array<{
      id: string;
      subjectId: string;
      kind: string;
      description: string | null;
      authorKind: string;
      svg: string;
      /** For a rendered formula, its source. */
      latex: string | null;
      createdAt: string;
    }>;
    questions: Array<{
      subjectId: string;
      lesson: string;
      id: string;
      variantOf: string | null;
      prompt: unknown;
      options: unknown;
      retired: boolean;
      teaches: string[];
      covers: string[];
    }>;
  };
  lessonLearning: {
    progress: Array<{
      subjectId: string;
      lesson: string;
      status: string;
      session: unknown;
      startedAt: string;
      updatedAt: string;
      passedAt: string | null;
    }>;
    answers: Array<{
      questionId: string;
      presentationId: string;
      chosenOption: number;
      correct: boolean;
      phase: string;
      misses: number;
      answeredAt: string;
    }>;
    comments: Array<{
      subjectId: string;
      screen: string;
      body: string;
      createdAt: string;
      resolvedAt: string | null;
      resolvedBy: string | null;
    }>;
    reviews: Array<{
      questionId: string;
      easiness: number;
      intervalDays: number;
      repetitions: number;
      lastRating: number | null;
      dueAt: string;
      lastReviewedAt: string | null;
    }>;
  };
  subjects: Array<{
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
    concepts: Array<{
      slug: string;
      name: string;
      kind: string;
      tier: string;
      position: number;
      cardIds: string[];
    }>;
    edges: Array<{
      from: string;
      to: string;
      strength: string;
      reason: string | null;
    }>;
  }>;
  apiKeys: Array<{
    name: string;
    keyPrefix: string;
    scope: string;
    createdAt: string;
  }>;
}

/**
 * Assemble everything the user owns as one JSON document (§13.3 data
 * portability). API keys are listed as metadata only — the secret is a
 * credential, not personal data, and must never be re-exposed. Flashcard
 * datasets are small, so this is synchronous; if payloads ever approach
 * ~5MB, switch to a background job + notification.
 */
export async function exportData(userId: string): Promise<AccountExport> {
  const profile = await repo.findProfile(userId);
  if (!profile) throw new NotFoundError("User not found");

  const [
    decks,
    cards,
    progress,
    reviewEvents,
    apiKeys,
    subjects,
    concepts,
    conceptEdges,
    cardReads,
    lessonModules,
    lessons,
    screens,
    lessonQuestions,
    lessonProgress,
    questionAttempts,
    questionReviews,
    screenComments,
    assets,
  ] = await Promise.all([
    repo.findDecks(userId),
    repo.findCards(userId),
    repo.findProgress(userId),
    repo.findReviewEvents(userId),
    repo.findApiKeyMeta(userId),
    repo.findSubjects(userId),
    repo.findConcepts(userId),
    repo.findConceptEdges(userId),
    repo.findCardReads(userId),
    repo.findLessonModules(userId),
    repo.findLessons(userId),
    repo.findScreens(userId),
    repo.findLessonQuestions(userId),
    repo.findLessonProgress(userId),
    repo.findQuestionAttempts(userId),
    repo.findQuestionReviews(userId),
    repo.findScreenComments(userId),
    repo.findAssets(userId),
  ]);

  const cardsByDeck = new Map<string, repo.CardRow[]>();
  for (const card of cards) {
    const list = cardsByDeck.get(card.deck_id) ?? [];
    list.push(card);
    cardsByDeck.set(card.deck_id, list);
  }

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      email: profile.email,
      displayName: profile.display_name,
      role: profile.role,
      accountType: profile.account_type,
      language: profile.language,
      speech: {
        enabled: profile.speech_enabled,
        lang: profile.speech_lang,
        autoplay: profile.speech_autoplay,
        rate: profile.speech_rate,
      },
      emailVerifiedAt: profile.email_verified_at,
      createdAt: profile.created_at,
    },
    decks: decks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      sourceFilename: deck.source_filename,
      isPublic: deck.is_public,
      isOrdered: deck.is_ordered,
      speech: {
        enabled: deck.speech_enabled,
        frontLang: deck.speech_front_lang,
        backLang: deck.speech_back_lang,
        autoplay: deck.speech_autoplay,
        rate: deck.speech_rate,
      },
      createdAt: deck.created_at,
      updatedAt: deck.updated_at,
      cards: (cardsByDeck.get(deck.id) ?? []).map((card) => ({
        id: card.id,
        type: card.type,
        content: card.content,
        category: card.category,
        position: card.position,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      })),
    })),
    cardProgress: progress.map((p) => ({
      cardId: p.card_id,
      repetitions: p.repetitions,
      easeFactor: p.ease_factor,
      intervalDays: p.interval_days,
      dueAt: p.due_at,
      lastReviewedAt: p.last_reviewed_at,
      lastRating: p.last_rating,
    })),
    reviewEvents: reviewEvents.map((e) => ({
      eventId: e.event_id,
      cardId: e.card_id,
      rating: e.rating,
      reviewedAt: e.reviewed_at,
      optionIndex: e.option_index,
      createdAt: e.created_at,
    })),
    cardReads: cardReads.map((read) => ({
      cardId: read.card_id,
      readAt: read.read_at,
    })),
    lessonContent: {
      modules: lessonModules.map((m) => ({
        id: m.id,
        subjectId: m.subject_id,
        title: m.title,
        position: m.position,
      })),
      lessons: lessons.map((l) => ({
        subjectId: l.subject_id,
        moduleId: l.module_id,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        stage: l.stage,
        position: l.position,
        covers: l.covers,
        prerequisites: l.prerequisites,
      })),
      screens: screens.map((sc) => ({
        subjectId: sc.subject_id,
        lesson: sc.lesson_slug,
        number: sc.number,
        blocks: sc.blocks,
        authorKind: sc.author_kind,
        sources: sc.sources,
        retired: sc.retired_at !== null,
        revisions: sc.revisions.map((r) => ({
          change: r.change,
          changedAt: r.changed_at,
          blocks: r.blocks,
        })),
      })),
      assets: assets.map((a) => ({
        id: a.id,
        subjectId: a.subject_id,
        kind: a.kind,
        description: a.description,
        authorKind: a.author_kind,
        svg: a.content,
        latex: a.latex,
        createdAt: a.created_at,
      })),
      questions: lessonQuestions.map((q) => ({
        subjectId: q.subject_id,
        lesson: q.lesson_slug,
        id: q.id,
        variantOf: q.parent_id,
        prompt: q.prompt,
        options: q.options,
        retired: q.retired_at !== null,
        teaches: q.teaches,
        covers: q.covers,
      })),
    },
    lessonLearning: {
      progress: lessonProgress.map((p) => ({
        subjectId: p.subject_id,
        lesson: p.lesson_slug,
        status: p.status,
        session: p.session,
        startedAt: p.started_at,
        updatedAt: p.updated_at,
        passedAt: p.passed_at,
      })),
      answers: questionAttempts.map((a) => ({
        questionId: a.question_id,
        presentationId: a.presentation_id,
        chosenOption: a.chosen_option,
        correct: a.correct,
        phase: a.phase,
        misses: a.misses,
        answeredAt: a.attempted_at,
      })),
      comments: screenComments.map((c) => ({
        subjectId: c.subject_id,
        screen: c.number,
        body: c.body,
        createdAt: c.created_at,
        resolvedAt: c.resolved_at,
        resolvedBy: c.resolved_by,
      })),
      reviews: questionReviews.map((r) => ({
        questionId: r.question_id,
        easiness: r.easiness,
        intervalDays: r.interval_days,
        repetitions: r.repetitions,
        lastRating: r.last_rating,
        dueAt: r.due_at,
        lastReviewedAt: r.last_reviewed_at,
      })),
    },
    subjects: subjects.map((subject) => ({
      id: subject.id,
      title: subject.title,
      description: subject.description,
      isPublic: subject.is_public,
      version: subject.version,
      createdAt: subject.created_at,
      updatedAt: subject.updated_at,
      concepts: concepts
        .filter((concept) => concept.subject_id === subject.id)
        .map((concept) => ({
          slug: concept.slug,
          name: concept.name,
          kind: concept.kind,
          tier: concept.tier,
          position: concept.position,
          cardIds: concept.card_ids,
        })),
      edges: conceptEdges
        .filter((edge) => edge.subject_id === subject.id)
        .map((edge) => ({
          from: edge.from_slug,
          to: edge.to_slug,
          strength: edge.strength,
          reason: edge.reason,
        })),
    })),
    apiKeys: apiKeys.map((k) => ({
      name: k.name,
      keyPrefix: k.key_prefix,
      scope: k.scope,
      createdAt: k.created_at,
    })),
  };
}
