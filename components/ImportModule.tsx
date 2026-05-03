"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateQuizJSON } from "@/lib/schemas/quiz";
import { sanitizeQuizItems } from "@/lib/sanitize";
import type { QuizItem } from "@/types/quiz";
import type { ImportStatus } from "@/types/quiz";

interface ImportModuleProps {
  onImport: (items: QuizItem[]) => void;
}

const EXAMPLE_JSON = `[
  {
    "type": "identification",
    "prompt": "What does CSRF stand for?",
    "accepted_answers": ["Cross-Site Request Forgery", "CSRF"],
    "options": [
      "Cross-Site Request Forgery",
      "Cross-Site Resource Fetch",
      "Client-Side Request Failure",
      "Credential Session Request Forgery"
    ]
  },
  {
    "type": "multiple_select",
    "prompt": "Which are symmetric encryption algorithms?",
    "accepted_answers": ["AES", "ChaCha20"],
    "options": [
      "AES",
      "RSA",
      "ChaCha20",
      "ECDSA"
    ]
  }
]`;

const LLM_JSON_PROMPT = `Generate a SentinelQuiz JSON array for the topic I provide.

Return only valid JSON. Do not include markdown, comments, explanations, or trailing commas.

Each array item must match one of these schemas:

Identification:
{
  "type": "identification",
  "prompt": "A clear question or recall prompt",
  "accepted_answers": ["Primary answer", "Common abbreviation or synonym"],
  "options": ["Primary answer", "Distractor 1", "Distractor 2", "Distractor 3"]
}

Multiple choice:
{
  "type": "multiple_choice",
  "prompt": "A clear question",
  "accepted_answers": ["Exactly one correct answer"],
  "options": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"]
}

Multiple select:
{
  "type": "multiple_select",
  "prompt": "A clear question with more than one correct answer",
  "accepted_answers": ["Correct answer 1", "Correct answer 2"],
  "options": ["Correct answer 1", "Correct answer 2", "Distractor 1", "Distractor 2"]
}

Rules:
- Generate the number of questions I request.
- Use concise, unambiguous prompts.
- Keep every string plain text, with no HTML.
- For identification, include common aliases, abbreviations, and alternate phrasings in accepted_answers.
- For multiple_choice, accepted_answers must contain exactly one string.
- For multiple_select, accepted_answers must contain at least two strings.
- options must include all accepted answers and plausible distractors.
- identification and multiple_choice options must contain exactly 4 strings.
- multiple_select options must contain at least 4 strings.
- Avoid duplicate options within the same item.

Topic: [replace with topic]
Question count: [replace with count]
Difficulty: [replace with difficulty]`;

interface LogLine {
  id: number;
  type: "info" | "success" | "error" | "warn";
  text: string;
}

export default function ImportModule({ onImport }: ImportModuleProps) {
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logCounter = useRef(0);

  const addLog = useCallback((type: LogLine["type"], text: string) => {
    const id = logCounter.current++;
    setLogLines((prev) => [...prev.slice(-19), { id, type, text }]);
  }, []);

  const processJSON = useCallback(
    async (raw: string) => {
      setLogLines([]);
      setStatus("validating");
      addLog("info", "INIT — Firewall ingestion pipeline started");
      addLog("info", `RAW — Received ${raw.length} bytes`);

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
        addLog("info", "PARSE — JSON syntax valid ✓");
      } catch (e) {
        addLog("error", `PARSE — Invalid JSON: ${(e as Error).message}`);
        setStatus("error");
        return;
      }

      // Zod validation
      await delay(200);
      addLog("info", "SCHEMA — Running Zod safeParse()...");
      const validation = validateQuizJSON(parsed);

      if (!validation.success) {
        addLog("error", `SCHEMA — Validation failed`);
        validation.details?.forEach((d) => addLog("error", `  → ${d}`));
        setStatus("error");
        return;
      }

      addLog(
        "success",
        `SCHEMA — ${validation.data!.length} item(s) passed structural validation ✓`
      );

      // Sanitization
      await delay(200);
      setStatus("sanitizing");
      addLog("info", "SANITIZE — Stripping HTML/XSS vectors via DOMPurify...");

      const { items, warnings } = await sanitizeQuizItems(validation.data!);

      warnings.forEach((w) => addLog("warn", `SANITIZE — ${w}`));

      if (warnings.length === 0) {
        addLog("success", "SANITIZE — No malicious content detected ✓");
      }

      addLog(
        "success",
        `COMPLETE — ${items.length} item(s) cleared security firewall ✓`
      );
      setStatus("success");

      await delay(400);
      onImport(items);
    },
    [addLog, onImport]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      await processJSON(text);
    } catch {
      addLog("error", "CLIPBOARD — Permission denied or no text found");
      setStatus("error");
    }
  }, [processJSON, addLog]);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json") && file.type !== "application/json") {
        addLog("error", "FILE — Only .json files are accepted");
        setStatus("error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputValue(text);
        processJSON(text);
      };
      reader.readAsText(file);
    },
    [processJSON, addLog]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleSubmit = () => {
    if (inputValue.trim()) processJSON(inputValue.trim());
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addLog("success", `CLIPBOARD - ${label} copied`);
    } catch {
      addLog("error", `CLIPBOARD - Failed to copy ${label.toLowerCase()}`);
    }
  };

  const logColor = {
    info: "text-sentinel-text-dim",
    success: "text-sentinel-accent",
    error: "text-sentinel-danger",
    warn: "text-sentinel-warn",
  };

  const logPrefix = {
    info: "  ",
    success: "▶ ",
    error: "✗ ",
    warn: "⚠ ",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="section-label">JSON Import — Security Firewall</span>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              status === "success"
                ? "bg-sentinel-accent shadow-[0_0_8px_var(--accent)]"
                : status === "error"
                ? "bg-sentinel-danger shadow-[0_0_8px_var(--danger)]"
                : status === "idle"
                ? "bg-sentinel-border"
                : "bg-sentinel-warn animate-pulse"
            }`}
          />
          <span className="font-mono text-xs text-sentinel-muted uppercase">
            {status}
          </span>
        </div>
      </div>

      {/* Drop zone + textarea */}
      <div
        className={`relative transition-all duration-200 ${
          isDragging ? "ring-2 ring-sentinel-accent/50" : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Paste JSON here or drag & drop a .json file...\n\nExpected format:\n${EXAMPLE_JSON}`}
          className="input-field min-h-[220px] resize-none font-mono text-xs leading-relaxed"
          spellCheck={false}
          disabled={status === "validating" || status === "sanitizing"}
        />
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-sentinel-bg/90 border-2 border-dashed border-sentinel-accent/50">
            <span className="font-mono text-sm text-sentinel-accent">
              DROP .JSON FILE
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || status === "validating" || status === "sanitizing"}
          className="btn-primary flex-1 sm:flex-none"
        >
          {status === "validating" || status === "sanitizing" ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-sentinel-bg border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            "RUN FIREWALL"
          )}
        </button>

        <button
          onClick={handlePaste}
          disabled={status === "validating" || status === "sanitizing"}
          className="btn-ghost"
        >
          PASTE CLIPBOARD
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={status === "validating" || status === "sanitizing"}
          className="btn-ghost"
        >
          UPLOAD FILE
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />

        {(inputValue || logLines.length > 0) && (
          <button
            onClick={() => {
              setInputValue("");
              setLogLines([]);
              setStatus("idle");
            }}
            className="btn-ghost ml-auto"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Example JSON hint */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setInputValue(EXAMPLE_JSON)}
          className="text-xs font-mono text-sentinel-muted hover:text-sentinel-accent transition-colors"
        >
          ← Load example JSON
        </button>
        <button
          onClick={() => copyToClipboard(EXAMPLE_JSON, "JSON format")}
          className="text-xs font-mono text-sentinel-muted hover:text-sentinel-accent transition-colors"
        >
          ⎘ Copy JSON format
        </button>
        <button
          onClick={() => copyToClipboard(LLM_JSON_PROMPT, "LLM prompt")}
          className="text-xs font-mono text-sentinel-muted hover:text-sentinel-accent transition-colors"
        >
          Copy LLM prompt
        </button>
      </div>

      {/* Security log terminal */}
      <AnimatePresence>
        {logLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="scanline-overlay"
          >
            <div className="bg-black/60 border border-sentinel-border p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
              <div className="text-sentinel-muted mb-2 text-[10px] tracking-widest">
                ── SECURITY PIPELINE LOG ──────────────────
              </div>
              {logLines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={logColor[line.type]}
                >
                  <span className="text-sentinel-muted mr-2">
                    {new Date().toLocaleTimeString("en", { hour12: false })}
                  </span>
                  {logPrefix[line.type]}
                  {line.text}
                </motion.div>
              ))}
              {(status === "validating" || status === "sanitizing") && (
                <span className="text-sentinel-accent cursor-blink" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
