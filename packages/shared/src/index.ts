export { calculate } from "./sm2/sm2";
export type { Sm2State, Sm2Result } from "./sm2/sm2";
export {
  parseDeck,
  isDiagnostic,
  isReading,
  CORRECT_TARGET,
} from "./markdown/parser";
export type {
  ParsedDeck,
  ParsedCard,
  ParsedOption,
  CardSense,
} from "./markdown/parser";
export { selectOptions, resolveChoice } from "./study/diagnostic";
export { STABLE_REPS, wordPhase, promptFor } from "./study/senses";
export type { WordPhase, SenseProgress, PromptCard } from "./study/senses";
export type { StudyOption, ChoiceResolution } from "./study/diagnostic";
export {
  resolveSpeech,
  shouldAutoplay,
  clampSpeechRate,
  speechBaseLanguage,
  SPEECH_AUTOPLAY_MODES,
  DEFAULT_SPEECH_AUTOPLAY,
  DEFAULT_SPEECH_RATE,
  MIN_SPEECH_RATE,
  MAX_SPEECH_RATE,
} from "./speech/resolve";
export type {
  SpeechAutoplay,
  CardSide,
  UserSpeechDefaults,
  DeckSpeechOverrides,
  ResolvedSpeech,
} from "./speech/resolve";
export * from "./slug";
export {
  CONCEPT_KINDS,
  CONCEPT_TIERS,
  EDGE_STRENGTHS,
} from "./graph/concept-graph-types";
export type {
  ConceptKind,
  ConceptTier,
  EdgeStrength,
  ConceptNode,
  ConceptEdge,
} from "./graph/concept-graph-types";
export {
  wouldCreateCycle,
  topologicalOrder,
  unorderableConcepts,
  prerequisiteLevels,
} from "./graph/prerequisites";
export { lintConceptGraph, MAX_REQUIRES_PARENTS } from "./graph/graph-lint";
export type { GraphIssue, GraphIssueCode } from "./graph/graph-lint";
export { computeConceptStatuses, studyFrontier } from "./graph/concept-status";
export type {
  ConceptEvidence,
  ConceptState,
  ConceptStatus,
} from "./graph/concept-status";
export {
  MAX_SCREEN_NUMBER_DECIMALS,
  compareScreenNumbers,
  isValidScreenNumber,
  normalizeScreenNumber,
  suggestScreenNumber,
} from "./lessons/screen-number";
export {
  BLOCK_TYPES,
  CALLOUT_TONES,
  IMAGE_DISPLAYS,
  formulasWithoutSpokenText,
  inlineMathWithoutSpokenText,
  validateBlocks,
} from "./lessons/lesson-blocks";
export type {
  Block,
  BlockIssue,
  BlockType,
  CalloutTone,
  FormulaBlock,
  ImageBlock,
  ImageDisplay,
  InlineMath,
  Span,
} from "./lessons/lesson-blocks";
export {
  RECOMMENDED,
  canFinish,
  canSave,
  lintLesson,
} from "./lessons/lesson-lint";
export type {
  LessonInput,
  LessonIssue,
  LessonIssueLevel,
  OptionInput,
  QuestionInput,
  ScreenInput,
  VariantInput,
} from "./lessons/lesson-lint";
export { seededRandom } from "./lessons/seeded-random";
export { buildOutline } from "./lessons/lesson-outline";
export type {
  OutlineEdgeInput,
  OutlineLesson,
  OutlineLessonInput,
  OutlineModule,
  OutlineModuleInput,
  OutlineUnlock,
} from "./lessons/lesson-outline";
export {
  HELP_AFTER_MISSES,
  SessionError,
  answerQuestion,
  comeBackLater,
  continueRemediation,
  describeStep,
  lessonResult,
  nextScreen,
  previousScreen,
  reconcile,
  resume,
  startSession,
} from "./lessons/lesson-session";
export type {
  AnswerOutcome,
  FirstTry,
  LessonResult,
  LessonSession,
  PresentationContent,
  QuestionContent,
  QuestionRun,
  SessionContent,
  SessionPhase,
  Step,
} from "./lessons/lesson-session";
export { canOpen, computeLessonAccess } from "./lessons/lesson-unlock";
export type {
  LessonAccess,
  LessonAccessInfo,
  LessonProgressStatus,
  PrerequisiteEdge,
} from "./lessons/lesson-unlock";
export {
  INITIAL_REVIEW_STATE,
  RATING_RIGHT,
  RATING_WRONG,
  dueQuestionIds,
  isReviewDue,
  ratingFor,
  scheduleReview,
} from "./lessons/question-review";
export type { ScheduledReview } from "./lessons/question-review";
export {
  parseInlineMarkup,
  spansToMarkup,
  escapeMarkup,
} from "./lessons/inline-markup";
export { toCompactBlocks, compactLesson } from "./lessons/compact-blocks";
