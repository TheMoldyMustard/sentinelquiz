"use client";

import { useEffect, useReducer, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fsmReducer, createInitialContext, getCurrentItem, getProgress, getFinalStats } from "@/lib/fsm";
import IdentificationMode from "./IdentificationMode";
import MultipleChoiceMode from "./MultipleChoiceMode";
import MultipleSelectMode from "./MultipleSelectMode";
import ScoreDisplay from "./ScoreDisplay";
import { normalizeAnswer } from "@/lib/answers";
import type { QuestionType, QuizItem, QuizMode } from "@/types/quiz";

interface QuizEngineProps {
  items: QuizItem[];
  mode: QuizMode;
  selectedModes?: QuestionType[];
  perfectionistMode?: boolean;
  onComplete?: (stats: ReturnType<typeof getFinalStats>) => void;
  onReset: () => void;
}

export default function QuizEngine({
  items,
  mode,
  selectedModes,
  perfectionistMode = false,
  onComplete,
  onReset,
}: QuizEngineProps) {
  const [ctx, dispatch] = useReducer(fsmReducer, {
    ...createInitialContext(),
    state: "idle",
  });

  useEffect(() => {
    dispatch({ type: "START", items, mode, selectedModes, perfectionistMode });
  }, [items, mode, selectedModes, perfectionistMode]);

  const handleSubmit = useCallback(
    (answer: string | string[]) => dispatch({ type: "SUBMIT_ANSWER", answer }),
    []
  );
  const handleHint = useCallback(() => dispatch({ type: "USE_HINT" }), []);
  const handleNext = useCallback(() => dispatch({ type: "NEXT" }), []);
  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    onReset();
  }, [onReset]);

  const currentItem = getCurrentItem(ctx);
  const visibleAcceptedAnswers = currentItem
    ? getVisibleAcceptedAnswers(currentItem)
    : [];
  const progress = getProgress(ctx);
  const stats = ctx.state === "complete" ? getFinalStats(ctx) : null;

  const isAnswered = ctx.state === "correct" || ctx.state === "incorrect";
  const isComplete = ctx.state === "complete";

  if (isComplete && stats) {
    if (onComplete) onComplete(stats);
    return <ScoreDisplay stats={stats} onReset={handleReset} answers={ctx.answers} />;
  }

  if (!currentItem) return null;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-sentinel-muted">
            ITEM {ctx.currentIndex + 1} / {ctx.items.length}
          </span>
          <span className="text-sentinel-accent">
            {ctx.score} PTS
          </span>
        </div>
        {ctx.perfectionistMode && (
          <div className="flex items-center justify-between font-mono text-xs text-sentinel-danger">
            <span>PERFECTIONIST MODE ACTIVE</span>
            {ctx.voidCount > 0 && <span>VOIDS: {ctx.voidCount}</span>}
          </div>
        )}

        {/* Progress bar */}
        <div className="progress-bar">
          <motion.div
            className="progress-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Quiz content */}
      <AnimatePresence mode="wait">
        {!isAnswered ? (
          <motion.div
            key={`question-${ctx.voidCount}-${ctx.currentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {currentItem.type === "identification" ? (
              <IdentificationMode
                item={currentItem}
                hintUsed={ctx.state === "hint_used"}
                onSubmit={handleSubmit}
                onHint={handleHint}
                disabled={false}
                perfectionistMode={ctx.perfectionistMode}
              />
            ) : currentItem.type === "multiple_choice" ? (
              <MultipleChoiceMode
                item={currentItem}
                choices={ctx.shuffledChoices ?? []}
                hintUsed={ctx.state === "hint_used"}
                onSubmit={handleSubmit}
                onHint={handleHint}
                disabled={false}
              />
            ) : (
              <MultipleSelectMode
                item={currentItem}
                choices={ctx.shuffledChoices ?? []}
                hintUsed={ctx.state === "hint_used"}
                onSubmit={handleSubmit}
                onHint={handleHint}
                disabled={false}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`result-${ctx.currentIndex}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Result banner */}
            <div
              className={`p-5 border ${
                ctx.state === "correct"
                  ? "border-sentinel-accent/40 bg-sentinel-accent/5"
                  : "border-sentinel-danger/40 bg-sentinel-danger/5"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`font-mono text-xl font-bold ${
                    ctx.state === "correct"
                      ? "text-sentinel-accent glow-accent-text"
                      : "text-sentinel-danger"
                  }`}
                >
                  {ctx.state === "correct" ? "✓ CORRECT" : "✗ INCORRECT"}
                </span>
                {ctx.state === "correct" && (
                  <span className="tag text-sentinel-accent">
                    +{ctx.answers[ctx.answers.length - 1]?.pointsEarned} pts
                  </span>
                )}
              </div>

              {ctx.state === "incorrect" && (
                <div className="space-y-1">
                  <span className="section-label">Correct Answer</span>
                  <p className="font-mono text-sm text-sentinel-accent">
                    {visibleAcceptedAnswers.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Question recap */}
            <div className="space-y-1">
              <span className="section-label">Question</span>
              <p className="text-sentinel-text-dim text-sm font-body">
                {currentItem.prompt}
              </p>
            </div>

            <button onClick={handleNext} className="btn-primary w-full">
              {ctx.currentIndex + 1 < ctx.items.length ? "NEXT QUESTION →" : "VIEW RESULTS"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getVisibleAcceptedAnswers(item: QuizItem): string[] {
  if (item.type === "identification") return item.accepted_answers;

  const normalizedOptions = new Set(item.options.map(normalizeAnswer));
  const visibleAnswers = item.accepted_answers.filter((answer) =>
    normalizedOptions.has(normalizeAnswer(answer))
  );

  return visibleAnswers.length > 0 ? visibleAnswers : item.accepted_answers.slice(0, 1);
}
