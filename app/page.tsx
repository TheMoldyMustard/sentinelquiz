"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import ImportModule from "@/components/ImportModule";
import type { QuizItem, QuizMode } from "@/types/quiz";

type AppPhase = "import" | "configure";

export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<AppPhase>("import");
  const [items, setItems] = useState<QuizItem[]>([]);
  const [mode, setMode] = useState<QuizMode>("identification");

  const handleImport = (imported: QuizItem[]) => {
    setItems(imported);
    setTimeout(() => setPhase("configure"), 500);
  };

  const handleStart = () => {
    // Store in sessionStorage for quiz page
    sessionStorage.setItem(
      "sentinelquiz_session",
      JSON.stringify({ items, mode })
    );
    router.push("/quiz");
  };

  return (
    <main className="min-h-dvh grid-bg scanline-overlay flex flex-col">
      {/* Topbar */}
      <header className="border-b border-sentinel-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-sentinel-accent rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-sentinel-accent rotate-[-45deg]" />
          </div>
          <span className="font-mono font-semibold text-sm tracking-widest text-sentinel-text">
            SENTINELQUIZ
          </span>
          <span className="tag hidden sm:inline-flex">v1.0</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="status-dot font-mono text-xs text-sentinel-muted">SYSTEM READY</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-16">
        <div className="w-full max-w-2xl">
          {/* Title block */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="section-label mb-3">LEARNING ACCELERATOR</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-sentinel-text leading-tight mb-3">
              Zero-trust quiz engine
              <br />
              <span className="text-sentinel-accent glow-accent-text">
                for serious learners.
              </span>
            </h1>
            <p className="text-sentinel-text-dim font-body text-sm sm:text-base leading-relaxed max-w-lg">
              Import LLM-generated JSON. Every item passes validation and
              sanitization before entering the quiz engine.
            </p>
          </motion.div>

          {/* Phase indicator */}
          <div className="flex items-center gap-0 mb-8 font-mono text-xs">
            {(["import", "configure"] as AppPhase[]).map((p, idx) => (
              <div key={p} className="flex items-center">
                <div
                  className={`px-3 py-1.5 border transition-colors ${
                    phase === p
                      ? "border-sentinel-accent text-sentinel-accent bg-sentinel-accent/5"
                      : items.length > 0 && idx === 0
                      ? "border-sentinel-accent/30 text-sentinel-accent/50"
                      : "border-sentinel-border text-sentinel-muted"
                  }`}
                >
                  {idx + 1}. {p.toUpperCase()}
                </div>
                {idx < 1 && (
                  <div className="w-8 h-px bg-sentinel-border" />
                )}
              </div>
            ))}
          </div>

          {/* Main card */}
          <motion.div
            layout
            className="terminal-border bg-sentinel-surface p-6 sm:p-8 space-y-6"
          >
            <AnimatePresence mode="wait">
              {phase === "import" ? (
                <motion.div
                  key="import"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ImportModule onImport={handleImport} />
                </motion.div>
              ) : (
                <motion.div
                  key="configure"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Success summary */}
                  <div className="flex items-center gap-3 p-4 border border-sentinel-accent/30 bg-sentinel-accent/5">
                    <span className="text-sentinel-accent text-lg">✓</span>
                    <div>
                      <p className="font-mono text-sm text-sentinel-accent">
                        {items.length} items cleared security firewall
                      </p>
                      <p className="text-xs text-sentinel-text-dim mt-0.5">
                        Validated via Zod · Sanitized via DOMPurify
                      </p>
                    </div>
                  </div>

                  {/* Mode selection */}
                  <div className="space-y-3">
                    <span className="section-label">Quiz Mode</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ModeCard
                        active={mode === "identification"}
                        onClick={() => setMode("identification")}
                        title="Identification"
                        subtitle="Free-recall typing"
                        multiplier="×1.0"
                        description="Type the answer from memory. Higher points. Max retention."
                        icon="◆"
                        iconColor="text-sentinel-accent"
                      />
                      <ModeCard
                        active={mode === "multiple_choice"}
                        onClick={() => setMode("multiple_choice")}
                        title="Multiple Choice"
                        subtitle="Select from options"
                        multiplier="×0.5"
                        description="Choose from 4 options. Lower points. Good for initial exposure."
                        icon="◈"
                        iconColor="text-sentinel-warn"
                      />
                    </div>
                  </div>

                  {/* Scoring legend */}
                  <div className="border border-sentinel-border p-4 space-y-2 font-mono text-xs">
                    <div className="section-label mb-2">Scoring Formula</div>
                    <div className="text-sentinel-text-dim">
                      S = (B × M) − P
                    </div>
                    <div className="text-sentinel-muted space-y-1">
                      <div>B = 100 base points</div>
                      <div>
                        M = {mode === "identification" ? "1.0 (Identification)" : "0.5 (Multiple Choice)"}
                      </div>
                      <div>P = 25 per hint used</div>
                      <div className="text-sentinel-accent mt-2">
                        Max per item:{" "}
                        {mode === "identification" ? "100" : "50"} pts
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPhase("import")}
                      className="btn-ghost"
                    >
                      ← BACK
                    </button>
                    <button onClick={handleStart} className="btn-primary flex-1">
                      BEGIN SESSION →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-sentinel-border px-6 py-4 font-mono text-xs text-sentinel-muted flex items-center justify-between">
        <span>SentinelQuiz v1.0</span>
        <span>Developed by Lancelot Gultiano</span>
      </footer>
    </main>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

function ModeCard({
  active,
  onClick,
  title,
  subtitle,
  multiplier,
  description,
  icon,
  iconColor,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  multiplier: string;
  description: string;
  icon: string;
  iconColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        p-4 border text-left transition-all duration-150 space-y-2
        ${active
          ? "border-sentinel-accent bg-sentinel-accent/5"
          : "border-sentinel-border hover:border-sentinel-accent/40 hover:bg-sentinel-bg/50"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono text-lg ${iconColor}`}>{icon}</span>
        <span
          className={`font-mono text-xs ${
            active ? "text-sentinel-accent" : "text-sentinel-muted"
          }`}
        >
          {multiplier}
        </span>
      </div>
      <div>
        <div
          className={`font-display font-semibold text-sm ${
            active ? "text-sentinel-accent" : "text-sentinel-text"
          }`}
        >
          {title}
        </div>
        <div className="text-xs text-sentinel-muted font-mono">{subtitle}</div>
      </div>
      <p className="text-xs text-sentinel-text-dim font-body leading-relaxed">
        {description}
      </p>
      {active && (
        <div className="flex items-center gap-1 font-mono text-[10px] text-sentinel-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-sentinel-accent" />
          SELECTED
        </div>
      )}
    </button>
  );
}
