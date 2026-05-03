"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { normalizeAnswer } from "@/lib/answers";
import type { QuizItem } from "@/types/quiz";

interface MultipleChoiceModeProps {
  item: QuizItem;
  choices: string[];
  hintUsed: boolean;
  onSubmit: (answer: string) => void;
  onHint: () => void;
  disabled?: boolean;
}

export default function MultipleChoiceMode({
  item,
  choices,
  hintUsed,
  onSubmit,
  onHint,
  disabled = false,
}: MultipleChoiceModeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(null);
    setEliminated(new Set());
  }, [item.id]);

  const handleHint = () => {
    // Eliminate one wrong answer
    const correctChoices = new Set(item.accepted_answers.map(normalizeAnswer));
    const wrong = choices.filter(
      (c) => !correctChoices.has(normalizeAnswer(c)) && !eliminated.has(c)
    );
    if (wrong.length > 0) {
      const toEliminate = wrong[Math.floor(Math.random() * wrong.length)];
      setEliminated((prev) => new Set(Array.from(prev).concat(toEliminate)));
    }
    onHint();
  };

  const handleSubmit = () => {
    if (selected) onSubmit(selected);
  };

  const labels = ["A", "B", "C", "D"];

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Mode badge */}
      <div className="flex items-center gap-3">
        <span className="tag">
          <span className="text-sentinel-warn">◈</span> MULTIPLE CHOICE
        </span>
        <span className="tag text-sentinel-text-dim">×0.5 MULTIPLIER</span>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <span className="section-label">Question</span>
        <p className="text-sentinel-text text-lg font-display leading-relaxed">
          {item.prompt}
        </p>
      </div>

      {/* Hint notification */}
      {hintUsed && eliminated.size > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border border-sentinel-warn/30 bg-sentinel-warn/5 p-3"
        >
          <p className="font-mono text-xs text-sentinel-warn">
            ⚠ 1 wrong answer eliminated — -25pts penalty applied
          </p>
        </motion.div>
      )}

      {/* Choices */}
      <div className="space-y-2">
        {choices.map((choice, idx) => {
          const isEliminated = eliminated.has(choice);
          const isSelected = selected === choice;

          return (
            <motion.button
              key={choice}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => !isEliminated && !disabled && setSelected(choice)}
              disabled={disabled || isEliminated}
              className={`
                w-full flex items-center gap-4 p-4 border text-left
                transition-all duration-150 font-mono text-sm
                ${isEliminated
                  ? "border-sentinel-border/30 opacity-30 line-through cursor-not-allowed"
                  : isSelected
                  ? "border-sentinel-accent bg-sentinel-accent/5 text-sentinel-accent"
                  : "border-sentinel-border hover:border-sentinel-accent/50 hover:bg-sentinel-surface text-sentinel-text"
                }
              `}
            >
              <span
                className={`
                  flex-shrink-0 w-7 h-7 flex items-center justify-center border text-xs
                  ${isSelected
                    ? "border-sentinel-accent bg-sentinel-accent text-sentinel-bg"
                    : "border-sentinel-muted text-sentinel-muted"
                  }
                `}
              >
                {labels[idx]}
              </span>
              <span className="flex-1">{choice}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!selected || disabled}
          className="btn-primary flex-1"
        >
          CONFIRM ANSWER
        </button>

        {!hintUsed && (
          <button
            onClick={handleHint}
            disabled={disabled}
            className="btn-ghost"
          >
            ELIMINATE (–25pts)
          </button>
        )}
      </div>
    </motion.div>
  );
}
