"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import QuizEngine from "@/components/QuizEngine";
import type { QuestionType, QuizItem, QuizMode } from "@/types/quiz";

interface QuizSession {
  items: QuizItem[];
  mode: QuizMode;
  selectedModes?: QuestionType[];
  perfectionistMode?: boolean;
}

export default function QuizPage() {
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sentinelquiz_session");
      if (!raw) {
        setError("No active session found. Import a quiz first.");
        return;
      }
      const parsed = JSON.parse(raw) as QuizSession;
      if (!parsed.items?.length) {
        setError("Session contains no quiz items.");
        return;
      }
      setSession(parsed);
    } catch {
      setError("Failed to load session data.");
    }
  }, []);

  const handleReset = () => {
    sessionStorage.removeItem("sentinelquiz_session");
    router.push("/");
  };

  if (error) {
    return (
      <main className="min-h-dvh grid-bg flex items-center justify-center p-4">
        <div className="terminal-border bg-sentinel-surface p-8 max-w-md w-full text-center space-y-4">
          <div className="font-mono text-sentinel-danger text-4xl">✗</div>
          <p className="font-mono text-sm text-sentinel-text-dim">{error}</p>
          <button onClick={() => router.push("/")} className="btn-primary w-full">
            RETURN TO IMPORT
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-dvh grid-bg flex items-center justify-center">
        <div className="font-mono text-sm text-sentinel-muted animate-pulse">
          LOADING SESSION...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh grid-bg flex flex-col">
      {/* Topbar */}
      <header className="border-b border-sentinel-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-sentinel-accent rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-sentinel-accent rotate-[-45deg]" />
          </div>
          <span className="font-mono font-semibold text-sm tracking-widest text-sentinel-text">
            SENTINELQUIZ
          </span>
        </div>
        <button
          onClick={handleReset}
          className="font-mono text-xs text-sentinel-muted hover:text-sentinel-danger transition-colors"
        >
          ABORT SESSION
        </button>
      </header>

      {/* Quiz */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl terminal-border bg-sentinel-surface p-6 sm:p-8"
        >
          <QuizEngine
            items={session.items}
            mode={session.mode}
            selectedModes={session.selectedModes}
            perfectionistMode={session.perfectionistMode}
            onReset={handleReset}
          />
        </motion.div>
      </div>
    </main>
  );
}
