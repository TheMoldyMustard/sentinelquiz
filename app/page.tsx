"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import ImportModule from "@/components/ImportModule";
import {
  deleteSavedQuiz,
  loadSavedQuizzes,
  renameSavedQuiz,
  saveQuiz,
  type SavedQuiz,
} from "@/lib/storage";
import type { QuestionType, QuizItem } from "@/types/quiz";


type AppPhase = "import" | "configure";
const QUESTION_TYPES: QuestionType[] = [
  "identification",
  "multiple_choice",
  "multiple_select",
];

export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<AppPhase>("import");
  const [items, setItems] = useState<QuizItem[]>([]);
  const [selectedModes, setSelectedModes] = useState<QuestionType[]>(QUESTION_TYPES);
  const [perfectionistMode, setPerfectionistMode] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);

  const fallbackCount = items.filter((item) => !selectedModes.includes(item.type)).length;

  useEffect(() => {
    loadSavedQuizzes()
      .then(setSavedQuizzes)
      .catch(() => setSavedQuizzes([]));
  }, []);

  const handleImport = async (imported: QuizItem[]) => {
    setItems(imported);
    setSelectedModes(getAvailableModes(imported));
    try {
      await saveQuiz(imported);
      setSavedQuizzes(await loadSavedQuizzes());
    } catch {
      // Session import should still work if IndexedDB is unavailable.
    }
    setTimeout(() => setPhase("configure"), 500);
  };

  const handleLoadSaved = (quiz: SavedQuiz) => {
    setItems(quiz.items);
    setSelectedModes(getAvailableModes(quiz.items));
    setPhase("configure");
  };

  const handleRenameSaved = async (quiz: SavedQuiz) => {
    const nextName = window.prompt("Rename saved quiz", quiz.name);
    if (!nextName || nextName.trim() === quiz.name) return;

    await renameSavedQuiz(quiz.id, nextName);
    setSavedQuizzes(await loadSavedQuizzes());
  };

  const handleDeleteSaved = async (quiz: SavedQuiz) => {
    const confirmed = window.confirm(`Delete "${quiz.name}" from saved quizzes?`);
    if (!confirmed) return;

    await deleteSavedQuiz(quiz.id);
    setSavedQuizzes(await loadSavedQuizzes());
  };

  const toggleMode = (mode: QuestionType) => {
    setSelectedModes((current) => {
      if (current.includes(mode)) {
        return current.length === 1
          ? current
          : current.filter((selected) => selected !== mode);
      }
      return [...current, mode];
    });
  };

  const handleStart = () => {
    // Store in sessionStorage for quiz page
    sessionStorage.setItem(
      "sentinelquiz_session",
      JSON.stringify({
        items,
        mode: "mixed",
        selectedModes,
        perfectionistMode,
      })
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

        <OnlineStatus />
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
                  {savedQuizzes.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <span className="section-label">Saved Quizzes</span>
                      <div className="space-y-2">
                        {savedQuizzes.slice(0, 5).map((quiz) => (
                          <div
                            key={quiz.id}
                            className="border border-sentinel-border p-3"
                          >
                            <button
                              onClick={() => handleLoadSaved(quiz)}
                              className="w-full text-left hover:text-sentinel-accent transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-sm text-sentinel-text">
                                  {quiz.name}
                                </span>
                                <span className="font-mono text-xs text-sentinel-muted">
                                  {quiz.items.length} items
                                </span>
                              </div>
                              <div className="font-mono text-[10px] text-sentinel-muted mt-1">
                                {new Date(quiz.updatedAt).toLocaleString()}
                              </div>
                            </button>
                            <div className="flex gap-3 mt-3">
                              <button
                                onClick={() => handleRenameSaved(quiz)}
                                className="font-mono text-[10px] text-sentinel-muted hover:text-sentinel-accent transition-colors"
                              >
                                RENAME
                              </button>
                              <button
                                onClick={() => handleDeleteSaved(quiz)}
                                className="font-mono text-[10px] text-sentinel-muted hover:text-sentinel-danger transition-colors"
                              >
                                DELETE
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                        {items.length} items queued
                      </p>
                      <p className="text-xs text-sentinel-text-dim mt-0.5">
                        Validated via Zod · Sanitized via DOMPurify
                      </p>
                    </div>
                  </div>

                  {/* Mode selection */}
                  <div className="space-y-3">
                    <span className="section-label">Quiz Modes</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <ModeCard
                        active={selectedModes.length === QUESTION_TYPES.length}
                        onClick={() => setSelectedModes(QUESTION_TYPES)}
                        title="All Modes"
                        subtitle="Use item types"
                        multiplier="AUTO"
                        description="Render each question according to its JSON type."
                        icon="◆"
                        iconColor="text-sentinel-accent"
                      />
                      <ModeCard
                        active={selectedModes.includes("identification")}
                        onClick={() => toggleMode("identification")}
                        title="Identification"
                        subtitle="Free-recall typing"
                        multiplier="×1.0"
                        description="Type the answer from memory. Higher points. Max retention."
                        icon="◆"
                        iconColor="text-sentinel-accent"
                      />
                      <ModeCard
                        active={selectedModes.includes("multiple_choice")}
                        onClick={() => toggleMode("multiple_choice")}
                        title="Multiple Choice"
                        subtitle="Select from options"
                        multiplier="×0.5"
                        description="Choose from 4 options. Lower points. Good for initial exposure."
                        icon="◈"
                        iconColor="text-sentinel-warn"
                      />
                      <ModeCard
                        active={selectedModes.includes("multiple_select")}
                        onClick={() => toggleMode("multiple_select")}
                        title="Multi Select"
                        subtitle="Select all that apply"
                        multiplier="×0.75"
                        description="Choose every correct option. Partial selections fail."
                        icon="■"
                        iconColor="text-sentinel-warn"
                      />
                    </div>
                    <p className="text-xs font-mono text-sentinel-muted">
                      Selected: {formatSelectedModes(selectedModes)}
                    </p>
                  </div>

                  <label className="flex items-center justify-between gap-4 border border-sentinel-border p-4">
                    <div>
                      <span className="section-label">Perfectionist Mode</span>
                      <p className="text-xs text-sentinel-text-dim mt-1">
                        Any incorrect answer voids points and restarts from item 1.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfectionistMode}
                      onChange={(event) => setPerfectionistMode(event.target.checked)}
                      className="h-5 w-5 accent-red-500"
                    />
                  </label>

                  {/* Scoring legend */}
                  <div className="border border-sentinel-border p-4 space-y-2 font-mono text-xs">
                    <div className="section-label mb-2">Scoring Formula</div>
                    <div className="text-sentinel-text-dim">
                      S = (B × M) − P
                    </div>
                    <div className="text-sentinel-muted space-y-1">
                      <div>B = 100 base points</div>
                      <div>
                        M = per selected question type
                      </div>
                      <div>P = 25 per hint used</div>
                      <div className="text-sentinel-accent mt-2">
                        Max per item:{" "}
                        {selectedModes.length > 1
                          ? "varies"
                          : selectedModes[0] === "identification"
                          ? "100"
                          : selectedModes[0] === "multiple_choice"
                          ? "50"
                          : "75"} pts
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
                    <button
                      onClick={handleStart}
                      className="btn-primary flex-1"
                    >
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

function getAvailableModes(items: QuizItem[]): QuestionType[] {
  const availableModes = QUESTION_TYPES.filter((type) =>
    items.some((item) => item.type === type)
  );
  return availableModes.length > 0 ? availableModes : QUESTION_TYPES;
}

function formatSelectedModes(modes: QuestionType[]): string {
  return modes
    .map((mode) => {
      if (mode === "identification") return "Identification";
      if (mode === "multiple_choice") return "Multiple Choice";
      return "Multiple Select";
    })
    .join(", ");
}

function OnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          online
            ? "bg-sentinel-accent shadow-[0_0_8px_var(--accent)] animate-pulse"
            : "bg-sentinel-danger shadow-[0_0_8px_var(--danger)]"
        }`}
      />
      <span className={`font-mono text-xs ${online ? "text-sentinel-muted" : "text-sentinel-danger"}`}>
        {online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}
