export interface User {
  id: string;
  email: string;
  role: string;
}

export interface DeckWithCounts {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  card_count: string;
  due_count: string;
}

export interface Card {
  id: string;
  type: string;
  content: { front: string; back: string };
  category: string | null;
  position: number;
}

export interface DeckDetail {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  cards: Card[];
}

export interface StudyCard {
  id: string;
  content: { front: string; back: string };
  category: string | null;
}

export interface ReviewResult {
  card_id: string;
  easiness: number;
  interval: number;
  repetitions: number;
  due_at: string;
}

export interface DeckStats {
  total: number;
  new: number;
  due: number;
  learned: number;
}
