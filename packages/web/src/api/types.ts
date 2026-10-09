import type {
  SpeechAutoplay,
  CardSense,
  WordPhase,
  ParsedOption,
} from "@flashkarte/shared";

export type AccountType = "free" | "paid" | "admin-gifted" | "admin";

export interface BillingStatus {
  signupDiscount?: {
    code: string;
    percentOff: number;
    discountDuration: "once" | "forever";
    plan: "monthly" | "yearly";
  } | null;
  promoAccessEndsAt?: string | null;
  plan: "free" | "paid";
  accountType: AccountType;
  activeUnitCount: number;
  activeUnitLimit: number | null;
  overLimit: boolean;
  subscription: {
    provider: "stripe" | "google_play";
    plan: "monthly" | "yearly";
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export type BillingUnitType =
  "deck" | "course" | "subject" | "course_collection";

export interface BillingUnit {
  unit_type: BillingUnitType;
  unit_id: string;
  title: string;
  active: boolean;
}

/** A deck's speech overrides. Null means "inherit the global default". */
export interface DeckSpeech {
  speech_enabled: boolean | null;
  speech_front_lang: string | null;
  speech_back_lang: string | null;
  speech_autoplay: SpeechAutoplay | null;
  speech_rate: number | null;
}

// One kind per login. Decides who the user can share their own content with.
export type AccountKind = "individual" | "school" | "teacher" | "student";

export interface User {
  id: string;
  email: string;
  role: string;
  accountType: AccountType;
  accountKind?: AccountKind;
  emailVerifiedAt: string | null;
  displayName: string | null;
  language: string | null;
  twoFactorEnabled: boolean;
  speechEnabled: boolean;
  speechLang: string | null;
  speechAutoplay: SpeechAutoplay;
  speechRate: number;
}

export interface LibraryDeck {
  contentLanguage?: string | null;
  id: string;
  referenceNumber?: number;
  title: string;
  author: string;
  cardCount: number;
  publishedAt: string | null;
  categoryId: string | null;
}

export interface LibraryDeckDetail extends LibraryDeck {
  cards: { front: string; back: string; category: string | null }[];
}

export interface PublicDeckPreview {
  id: string;
  referenceNumber?: number;
  title: string;
  author: string;
  cardCount: number;
  publishedAt: string | null;
  cards: { front: string; category: string | null }[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  accountType: AccountType;
  accountKind?: AccountKind;
  schoolId?: string | null;
  teacherVerified?: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface School {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  teacherEmail: string;
  schoolId: string | null;
  schoolName: string | null;
  memberCount: number;
  createdAt: string;
}

export interface SchoolClassDetail extends SchoolClass {
  members: { id: string; email: string; displayName: string | null }[];
}

export type ShareScope = "school" | "class" | "teacher_students";

export interface DeckShare {
  scope: ShareScope;
  schoolId: string | null;
  classId: string | null;
}

export interface ShareOptions {
  accountKind: AccountKind;
  school: { id: string; name: string } | null;
  classes: { id: string; name: string }[];
  canShareWithSchool: boolean;
  canShareWithAllStudents: boolean;
}

export interface DeckSharing {
  shares: DeckShare[];
  options: ShareOptions;
}

/** A deck-course someone shared with the caller through their school, teacher or class. */
export interface SharedCourse {
  id: string;
  referenceNumber: number;
  title: string;
  description: string | null;
  contentLanguage: string | null;
  decksTotal: number;
  author: string | null;
  subscribed: boolean;
  scopes: ShareScope[];
}

/** A structured course someone shared with the caller. */
export interface SharedSubject {
  id: string;
  referenceNumber: number;
  title: string;
  description: string | null;
  locale: string | null;
  author: string | null;
  enrolled: boolean;
  scopes: ShareScope[];
}

/** A deck someone shared with the caller through their school, teacher or class. */
export interface SharedDeck {
  id: string;
  referenceNumber: number;
  title: string;
  contentLanguage: string | null;
  cardCount: number;
  author: string | null;
  subscribed: boolean;
  scopes: ShareScope[];
}

export interface EmailCampaignSummary {
  id: string;
  status: "queued" | "sending" | "completed" | "failed" | "cancelled";
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export interface OfficialDeck {
  content_language?: string | null;
  id: string;
  reference_number?: number;
  title: string;
  created_at: string;
  card_count: number;
  subscribed: boolean;
  category_id: string | null;
}

export interface DeckCollection {
  content_language?: string | null;
  id: string;
  title: string;
  description: string | null;
  deck_count: number;
  category_id: string | null;
}

export interface DeckCollectionDetail {
  content_language?: string | null;
  id: string;
  title: string;
  description: string | null;
  decks: OfficialDeck[];
}

/**
 * A node in the two-level category tree, shared by the App Decks and
 * Library browse pages. `id: "uncategorized"` is a synthetic entry (not a
 * real category row) for items with no category assigned; render its title
 * from local i18n rather than the server's placeholder text. `officialCount`
 * and `publicCount` are kept separate (not summed) so each page's badge
 * reflects only what it actually displays — App Decks shows officialCount,
 * Library shows publicCount.
 */
export interface DeckCategory {
  id: string;
  title: string;
  parentId: string | null;
  officialCount: number;
  publicCount: number;
  subcategories: DeckCategory[];
}

export interface DeckWithCounts extends DeckSpeech {
  content_language?: string | null;
  id: string;
  reference_number?: number;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  card_count: number;
  due_count: number;
  // Lessons (reading cards) are counted apart from the review numbers above.
  lesson_count?: number;
  unread_lesson_count?: number;
  is_public: boolean;
  // True for an official (app-owned) deck the caller has subscribed to.
  // Owner-only actions (rename/delete/share/speech) are hidden for these in
  // the UI since the mutation would silently no-op against the system owner.
  is_official: boolean;
  // True for someone else's deck shared with the caller (school, teacher or
  // classmates) that they added. Read-only, like an official deck.
  is_shared?: boolean;
  // Shared and shown because the caller belongs to a school: it cannot be
  // removed, it goes when the share or the membership ends.
  auto_added?: boolean;
  viewed_count: number;
  new_count: number;
  again_count: number;
  hard_count: number;
  good_count: number;
  easy_count: number;
  // True when the deck contains at least one `branch` card, i.e. it is a
  // decision-tree deck rather than a spaced-repetition deck. Branch cards carry
  // `{ label, prompt, options }` instead of `{ front, back }`, so web — which is
  // flip-only — cannot study them and must not offer to.
  is_branching: boolean;
}

// Raw stored content, as `GET /decks/:id` and `PATCH .../cards/:cardId` both
// return it: a branch card's display text is keyed `prompt`, not `front`.
export interface CardContent {
  front?: string;
  prompt?: string;
  back?: string;
  label?: string | null;
  options?: ParsedOption[];
  sense?: CardSense | null;
}

export interface Card {
  id: string;
  type: string;
  content: CardContent;
  category: string | null;
  position: number;
}

/** Fields a single-card edit may change — see decks.service.ts's cardPatchSchema. */
export interface CardEditPatch {
  front?: string;
  back?: string;
  category?: string | null;
  options?: ParsedOption[];
  sense?: { word?: string; context?: string | null; hint?: string | null };
}

export interface DeckSettings extends DeckSpeech {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_ordered: boolean;
}

export interface DeckDetail {
  id: string;
  reference_number?: number;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  cards: Card[];
}

export interface StudyCard {
  id: string;
  // "read" for a lesson (reading card): shown for reading and acknowledged with
  // "Got it", never rated. Absent or "basic" for every other card.
  type?: string;
  // `sense` is present only on cards that are one meaning of a word block (Spec 10);
  // `label`/`options` only on a diagnostic card (Spec 01) -- one option targets
  // the reserved CORRECT_TARGET, the rest route to remediation labels or "end".
  // Every other card renders exactly as before.
  content: {
    front: string;
    back: string;
    label?: string | null;
    options?: ParsedOption[];
    sense?: CardSense | null;
  };
  // Which phase to render a sense card in. Only the server sees every sense's
  // progress, so it decides; absent for ordinary cards.
  phase?: WordPhase;
  category: string | null;
  // The card's fixed place in the deck, independent of study order (the
  // scheduler studies cards out of sequence).
  position: number;
}

export interface ReviewResult {
  card_id: string;
  easiness: number;
  interval: number;
  repetitions: number;
  due_at: string;
}

/** Learning blocks: a large deck is studied 40 cards at a time (server-computed). */
export interface LearningBlock {
  block_size: number;
  blocks_total: number;
  /** 1-based; null once every block is mastered. */
  current_block: number | null;
  current_block_cards: number;
  current_block_mastered: number;
}

export interface DeckStats {
  total: number;
  new: number;
  due: number;
  learned: number;
  /** Absent from servers that predate learning blocks; null if it couldn't be computed. */
  learning_block?: LearningBlock | null;
}

/** "full" works like the owner's login. "deck" is limited to deck data and is recorded as AI-authored. */
export type ApiKeyScope = "full" | "deck";

export interface ApiKey {
  name: string;
  key_prefix: string;
  created_at: string;
  scope: ApiKeyScope;
}

export interface CreatedApiKey extends ApiKey {
  key: string;
}

export interface Course {
  content_language?: string | null;
  id: string;
  reference_number?: number;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Someone else's course shared with the caller (school, teacher, class):
  // read-only, and removed rather than deleted.
  is_shared?: boolean;
  // The caller added that shared course to their courses.
  subscribed?: boolean;
  // Shown because the caller belongs to a school; cannot be removed.
  auto_added?: boolean;
}

/** A course as listed on "My Courses" -- a summary, not its full deck list. */
export interface CourseSummary extends Course {
  decks_total: number;
  decks_mastered: number;
}

/** One member deck of a course, with the gating state Study needs to render
 *  it as locked/unlocked. */
export interface CourseDeckView {
  deck_id: string;
  position: number;
  title: string;
  card_count: number;
  mastered_count: number;
  mastered: boolean;
  locked: boolean;
}

export interface CourseDetail extends Course {
  decks: CourseDeckView[];
}

export interface PublicCourseSummary extends Course {
  decks_total: number;
}

/** A public course's member deck, before the caller owns any of it --
 *  no lock/progress state, just what's in it. */
export interface PublicCourseDeck {
  deck_id: string;
  position: number;
  title: string;
  card_count: number;
}

export interface PublicCourseDetail extends Course {
  decks: PublicCourseDeck[];
}

export interface ClonedCourse {
  course: Course;
  decks_cloned: number;
  source_id: string;
}
