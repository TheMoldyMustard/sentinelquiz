// ─── Core Quiz Types ──────────────────────────────────────────────────────────

export interface QuizItem {
  id: string;
  question: string;
  answer: string;
  distractors: [string, string, string];
}

export interface RawQuizItem {
  question: string;
  answer: string;
  distractors: string[];
}

// ─── Quiz Mode ────────────────────────────────────────────────────────────────

export type QuizMode = "identification" | "multiple_choice";

export const MODE_MULTIPLIER: Record<QuizMode, number> = {
  identification: 1.0,
  multiple_choice: 0.5,
};

export const BASE_POINTS = 100;
export const HINT_PENALTY = 25;

// ─── FSM States ───────────────────────────────────────────────────────────────

export type QuizState =
  | "idle"
  | "loading"
  | "answering"
  | "hint_used"
  | "correct"
  | "incorrect"
  | "complete";

export interface FSMContext {
  state: QuizState;
  items: QuizItem[];
  currentIndex: number;
  mode: QuizMode;
  hintsUsed: number;
  score: number;
  answers: AnswerRecord[];
  shuffledChoices?: string[];
}

export interface AnswerRecord {
  itemId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  correct: boolean;
  hintUsed: boolean;
  pointsEarned: number;
  mode: QuizMode;
}

// ─── FSM Events ───────────────────────────────────────────────────────────────

export type FSMEvent =
  | { type: "START"; items: QuizItem[]; mode: QuizMode }
  | { type: "SUBMIT_ANSWER"; answer: string }
  | { type: "USE_HINT" }
  | { type: "NEXT" }
  | { type: "RESET" };

// ─── Import / Validation Types ────────────────────────────────────────────────

export type ImportStatus =
  | "idle"
  | "validating"
  | "sanitizing"
  | "success"
  | "error";

export interface ImportResult {
  status: ImportStatus;
  items?: QuizItem[];
  error?: string;
  warnings?: string[];
  itemCount?: number;
}

// ─── Supabase DB Types ────────────────────────────────────────────────────────

export interface QuizSession {
  id: string;
  user_id: string;
  items: QuizItem[];
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  session_id: string;
  score: number;
  total_possible: number;
  mode: QuizMode;
  answers: AnswerRecord[];
  completed_at: string;
}

// ─── Score Calculation ────────────────────────────────────────────────────────

/**
 * S = (B × M) - P
 * B = base points (100), M = mode multiplier, P = hint penalty
 */
export function calculatePoints(
  mode: QuizMode,
  hintUsed: boolean
): number {
  const B = BASE_POINTS;
  const M = MODE_MULTIPLIER[mode];
  const P = hintUsed ? HINT_PENALTY : 0;
  return Math.max(0, B * M - P);
}
