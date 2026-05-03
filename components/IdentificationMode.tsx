"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { QuizItem } from "@/types/quiz";

interface IdentificationModeProps {
  item: QuizItem;
  hintUsed: boolean;
  onSubmit: (answer: string) => void;
  onHint: () => void;
  disabled?: boolean;
  perfectionistMode?: boolean;
}

export default function IdentificationMode({
  item,
  hintUsed,
  onSubmit,
  onHint,
  disabled = false,
  perfectionistMode = false,
}: IdentificationModeProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [item.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  const hint = hintUsed
    ? generateHint(item.accepted_answers[0])
    : null;

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
          <span className="text-sentinel-accent">◆</span> IDENTIFICATION
        </span>
        <span className="tag text-sentinel-warn">×1.0 MULTIPLIER</span>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <span className="section-label">Question</span>
        <p className="text-sentinel-text text-lg font-display leading-relaxed">
          {item.prompt}
        </p>
      </div>

      {/* Hint */}
      {hint && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border border-sentinel-warn/30 bg-sentinel-warn/5 p-4"
        >
          <div className="section-label text-sentinel-warn mb-1">
            ⚠ HINT ACTIVE — -25pts penalty
          </div>
          <p className="font-mono text-sm text-sentinel-warn">{hint}</p>
        </motion.div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="section-label" htmlFor="id-answer">
            Your Answer
          </label>
          <input
            ref={inputRef}
            id="id-answer"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type your answer..."
            className={`input-field text-base ${
              perfectionistMode
                ? "border-sentinel-danger focus:border-sentinel-danger focus:ring-sentinel-danger/20"
                : ""
            }`}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className="btn-primary flex-1"
          >
            SUBMIT
          </button>

          {!hintUsed && (
            <button
              type="button"
              onClick={onHint}
              disabled={disabled}
              className="btn-ghost"
            >
              HINT (–25pts)
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
}

function generateHint(answer: string): string {
  const words = answer.split(" ");

  if (words.length > 2) {
    // Show first word + letter count of each subsequent word
    return (
      words[0] +
      " " +
      words
        .slice(1)
        .map((w) => "_".repeat(w.length))
        .join(" ")
    );
  }

  // Show first letter + underscores for rest
  return answer
    .split("")
    .map((char, idx) => {
      if (char === " ") return " ";
      if (idx === 0) return char.toUpperCase();
      return "_";
    })
    .join("");
}
