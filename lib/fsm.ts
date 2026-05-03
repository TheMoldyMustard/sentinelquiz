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
  QuestionType,
  QuizItem,
  QuizMode,
  QuizState,
} from "@/types/quiz";
import { calculatePoints } from "@/types/quiz";
import { checkAnswer, normalizeAnswer } from "@/lib/answers";

// ─── Initial State ────────────────────────────────────────────────────────────

export function createInitialContext(): FSMContext {
  return {
    state: "idle",
    items: [],
    currentIndex: 0,
    mode: "identification",
    selectedModes: ["identification", "multiple_choice", "multiple_select"],
    hintsUsed: 0,
    score: 0,
    answers: [],
    shuffledChoices: undefined,
    perfectionistMode: false,
    voidCount: 0,
  };
}

// ─── Shuffle helper ───────────────────────────────────────────────────────────

function shuffleChoices(item: QuizItem): string[] {
  const choices = [...item.options];
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
      const selectedModes = resolveSelectedModes(event.mode, event.selectedModes);
      const items = shuffleArray(resolveQuestionModes(event.items, selectedModes));
      const firstItem = items[0];
      return {
        ...createInitialContext(),
        state: "answering",
        items,
        mode: event.mode,
        selectedModes,
        perfectionistMode: event.perfectionistMode ?? false,
        shuffledChoices:
          firstItem.type === "multiple_choice" || firstItem.type === "multiple_select"
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
      const acceptedAnswers = getVisibleAcceptedAnswers(currentItem);
      const isCorrect = checkAnswer(event.answer, acceptedAnswers);
      const pointsEarned = isCorrect ? calculatePoints(currentItem.type, hintUsed) : 0;
      const answerRecord = {
        itemId: currentItem.id,
        question: currentItem.prompt,
        correctAnswer: acceptedAnswers.join(", "),
        userAnswer: Array.isArray(event.answer)
          ? event.answer.join(", ")
          : event.answer,
        correct: isCorrect,
        hintUsed,
        pointsEarned,
        mode: currentItem.type,
      };

      if (!isCorrect && ctx.perfectionistMode) {
        const items = shuffleArray(ctx.items);
        const firstItem = items[0];
        return {
          ...createInitialContext(),
          state: "answering",
          items,
          mode: ctx.mode,
          selectedModes: ctx.selectedModes,
          perfectionistMode: true,
          voidCount: ctx.voidCount + 1,
          shuffledChoices:
            firstItem.type === "multiple_choice" || firstItem.type === "multiple_select"
              ? shuffleChoices(firstItem)
              : undefined,
        };
      }

      return {
        ...ctx,
        state: isCorrect ? "correct" : "incorrect",
        score: ctx.score + pointsEarned,
        answers: [
          ...ctx.answers,
          answerRecord,
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
          nextItem.type === "multiple_choice" || nextItem.type === "multiple_select"
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

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Derived Getters ──────────────────────────────────────────────────────────

function resolveSelectedModes(
  mode: QuizMode,
  selectedModes?: QuestionType[]
): QuestionType[] {
  if (selectedModes?.length) return selectedModes;
  if (mode === "mixed") {
    return ["identification", "multiple_choice", "multiple_select"];
  }
  return [mode];
}

function resolveQuestionModes(
  items: QuizItem[],
  selectedModes: QuestionType[]
): QuizItem[] {
  return items.map((item) => {
    if (selectedModes.includes(item.type)) return ensureChoiceAnswerVisible(item);

    return ensureChoiceAnswerVisible({
      ...item,
      type: selectedModes[Math.floor(Math.random() * selectedModes.length)],
    });
  });
}

function ensureChoiceAnswerVisible(item: QuizItem): QuizItem {
  if (item.type === "identification") return item;
  if (getVisibleAcceptedAnswers(item).length > 0) return item;

  return {
    ...item,
    options: [item.accepted_answers[0], ...item.options.slice(1)],
  };
}

function getVisibleAcceptedAnswers(item: QuizItem): string[] {
  if (item.type === "identification") return item.accepted_answers;

  const normalizedOptions = new Set(item.options.map(normalizeAnswer));
  const visibleAnswers = item.accepted_answers.filter((answer) =>
    normalizedOptions.has(normalizeAnswer(answer))
  );

  return visibleAnswers.length > 0 ? visibleAnswers : item.accepted_answers.slice(0, 1);
}

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
  const maxPossible = ctx.items.reduce(
    (totalScore, item) => totalScore + calculatePoints(item.type, false),
    0
  );
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
