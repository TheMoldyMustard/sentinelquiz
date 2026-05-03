/**
 * Finite State Machine for SentinelQuiz.
 *
 * State transitions:
 *   idle ──START──► answering
 *   answering ──USE_HINT──► hint_used
 *   answering / hint_used ──SUBMIT_ANSWER──► correct | incorrect
 *   correct | incorrect ──NEXT──► answering | complete
 *   complete ──RESET──► idle
 */

import type {
  FSMContext,
  FSMEvent,
  QuizItem,
  QuizMode,
  QuizState,
} from "@/types/quiz";
import { calculatePoints } from "@/types/quiz";

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialContext(): FSMContext {
  return {
    state: "idle",
    items: [],
    currentIndex: 0,
    mode: "identification",
    hintsUsed: 0,
    score: 0,
    answers: [],
    shuffledChoices: undefined,
  };
}

// ─── Shuffle helper ───────────────────────────────────────────────────────────

function shuffleChoices(item: QuizItem): string[] {
  const choices = [item.answer, ...item.distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

// ─── FSM Reducer ─────────────────────────────────────────────────────────────

export function fsmReducer(ctx: FSMContext, event: FSMEvent): FSMContext {
  switch (event.type) {
    case "START": {
      if (ctx.state !== "idle") return ctx;
      const items = shuffleArray(event.items);
      const firstItem = items[0];
      return {
        ...createInitialContext(),
        state: "answering",
        items,
        mode: event.mode,
        shuffledChoices:
          event.mode === "multiple_choice"
            ? shuffleChoices(firstItem)
            : undefined,
      };
    }

    case "USE_HINT": {
      if (ctx.state !== "answering") return ctx;
      return {
        ...ctx,
        state: "hint_used",
        hintsUsed: ctx.hintsUsed + 1,
      };
    }

    case "SUBMIT_ANSWER": {
      if (ctx.state !== "answering" && ctx.state !== "hint_used") return ctx;

      const currentItem = ctx.items[ctx.currentIndex];
      const hintUsed = ctx.state === "hint_used";
      const isCorrect = normalizeAnswer(event.answer) === normalizeAnswer(currentItem.answer);
      const pointsEarned = isCorrect ? calculatePoints(ctx.mode, hintUsed) : 0;

      return {
        ...ctx,
        state: isCorrect ? "correct" : "incorrect",
        score: ctx.score + pointsEarned,
        answers: [
          ...ctx.answers,
          {
            itemId: currentItem.id,
            question: currentItem.question,
            correctAnswer: currentItem.answer,
            userAnswer: event.answer,
            correct: isCorrect,
            hintUsed,
            pointsEarned,
            mode: ctx.mode,
          },
        ],
      };
    }

    case "NEXT": {
      if (ctx.state !== "correct" && ctx.state !== "incorrect") return ctx;

      const nextIndex = ctx.currentIndex + 1;
      const isDone = nextIndex >= ctx.items.length;

      if (isDone) {
        return { ...ctx, state: "complete" };
      }

      const nextItem = ctx.items[nextIndex];
      return {
        ...ctx,
        state: "answering",
        currentIndex: nextIndex,
        shuffledChoices:
          ctx.mode === "multiple_choice"
            ? shuffleChoices(nextItem)
            : undefined,
      };
    }

    case "RESET": {
      return createInitialContext();
    }

    default:
      return ctx;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Derived Getters ──────────────────────────────────────────────────────────

export function getCurrentItem(ctx: FSMContext): QuizItem | undefined {
  return ctx.items[ctx.currentIndex];
}

export function getProgress(ctx: FSMContext): number {
  if (ctx.items.length === 0) return 0;
  return ctx.currentIndex / ctx.items.length;
}

export function getFinalStats(ctx: FSMContext) {
  const total = ctx.answers.length;
  const correct = ctx.answers.filter((a) => a.correct).length;
  const maxPossible = ctx.items.length * calculatePoints(ctx.mode, false);
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const hintsUsed = ctx.answers.filter((a) => a.hintUsed).length;

  return {
    score: ctx.score,
    maxPossible,
    total,
    correct,
    incorrect: total - correct,
    accuracy: Math.round(accuracy),
    hintsUsed,
    percentage: maxPossible > 0 ? Math.round((ctx.score / maxPossible) * 100) : 0,
  };
}

export function canTransition(state: QuizState, event: FSMEvent["type"]): boolean {
  const allowed: Record<QuizState, FSMEvent["type"][]> = {
    idle: ["START"],
    loading: [],
    answering: ["SUBMIT_ANSWER", "USE_HINT"],
    hint_used: ["SUBMIT_ANSWER"],
    correct: ["NEXT"],
    incorrect: ["NEXT"],
    complete: ["RESET"],
  };
  return allowed[state]?.includes(event) ?? false;
}
