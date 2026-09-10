export { calculate } from "./sm2/sm2";
export type { Sm2State, Sm2Result } from "./sm2/sm2";
export { parseDeck, isDiagnostic, CORRECT_TARGET } from "./markdown/parser";
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
