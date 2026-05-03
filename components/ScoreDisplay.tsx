"use client";

import { motion } from "framer-motion";
import type { getFinalStats } from "@/lib/fsm";
import type { AnswerRecord } from "@/types/quiz";

interface ScoreDisplayProps {
  stats: ReturnType<typeof getFinalStats>;
  answers: AnswerRecord[];
  onReset: () => void;
}

export default function ScoreDisplay({ stats, answers, onReset }: ScoreDisplayProps) {
  const grade =
    stats.percentage >= 90
      ? { label: "S", color: "text-sentinel-accent", glow: true }
      : stats.percentage >= 75
      ? { label: "A", color: "text-sentinel-accent", glow: false }
      : stats.percentage >= 60
      ? { label: "B", color: "text-sentinel-warn", glow: false }
      : stats.percentage >= 40
      ? { label: "C", color: "text-sentinel-text-dim", glow: false }
      : { label: "F", color: "text-sentinel-danger", glow: false };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Main score */}
      <div className="text-center py-8 border border-sentinel-border relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <div className="section-label mb-4">SESSION COMPLETE</div>
          <div
            className={`font-mono text-8xl font-bold tracking-tighter mb-2 ${grade.color} ${
              grade.glow ? "glow-accent-text" : ""
            }`}
          >
            {grade.label}
          </div>
          <div className="font-mono text-2xl text-sentinel-text">
            {stats.score}
            <span className="text-sentinel-muted text-base"> / {stats.maxPossible}</span>
          </div>
          <div className="font-mono text-sm text-sentinel-muted mt-1">
            {stats.percentage}% efficiency
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-sentinel-border">
        {[
          { label: "CORRECT", value: stats.correct, color: "text-sentinel-accent" },
          { label: "INCORRECT", value: stats.incorrect, color: "text-sentinel-danger" },
          { label: "ACCURACY", value: `${stats.accuracy}%`, color: "text-sentinel-text" },
          { label: "HINTS USED", value: stats.hintsUsed, color: "text-sentinel-warn" },
        ].map((stat) => (
          <div key={stat.label} className="bg-sentinel-surface p-5 text-center">
            <div className={`font-mono text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="section-label mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Answer breakdown */}
      <div className="space-y-3">
        <span className="section-label">Answer Breakdown</span>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {answers.map((record, idx) => (
            <motion.div
              key={record.itemId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`flex items-start gap-3 p-3 border text-sm ${
                record.correct
                  ? "border-sentinel-accent/20 bg-sentinel-accent/3"
                  : "border-sentinel-danger/20 bg-sentinel-danger/3"
              }`}
            >
              <span
                className={`font-mono text-xs mt-0.5 flex-shrink-0 w-4 ${
                  record.correct ? "text-sentinel-accent" : "text-sentinel-danger"
                }`}
              >
                {record.correct ? "✓" : "✗"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sentinel-text-dim text-xs truncate">{record.question}</p>
                <p className="font-mono text-xs mt-1">
                  <span className="text-sentinel-muted">Your: </span>
                  <span
                    className={record.correct ? "text-sentinel-accent" : "text-sentinel-danger"}
                  >
                    {record.userAnswer || "(no answer)"}
                  </span>
                  {!record.correct && (
                    <>
                      <span className="text-sentinel-muted mx-2">→</span>
                      <span className="text-sentinel-accent">{record.correctAnswer}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-mono text-xs text-sentinel-muted">
                  +{record.pointsEarned}
                </span>
                {record.hintUsed && (
                  <div className="text-[10px] text-sentinel-warn">hint</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onReset} className="btn-primary flex-1">
          NEW SESSION
        </button>
      </div>
    </motion.div>
  );
}
