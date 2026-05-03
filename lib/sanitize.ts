/**
 * Sanitization module — strips HTML/script from all string fields.
 * Uses jsdom on the server (Next.js SSR) and native DOMPurify on the client.
 */

import type { ValidatedQuizImport } from "@/lib/schemas/quiz";
import type { QuizItem } from "@/types/quiz";
import { randomUUID } from "crypto";

// ─── Server-safe HTML stripper ────────────────────────────────────────────────

function stripHTML(input: string): string {
  // Strip all HTML tags using regex (safe for plain text extraction)
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "data_")
    .trim();
}

// ─── Client-side DOMPurify (lazy-loaded) ─────────────────────────────────────

async function purifyClient(input: string): Promise<string> {
  if (typeof window === "undefined") return stripHTML(input);
  const DOMPurify = (await import("dompurify")).default;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// ─── Main sanitization function ───────────────────────────────────────────────

export async function sanitizeQuizItems(
  validated: ValidatedQuizImport
): Promise<{ items: QuizItem[]; warnings: string[] }> {
  const warnings: string[] = [];
  const isClient = typeof window !== "undefined";

  const items: QuizItem[] = await Promise.all(
    validated.map(async (raw, idx) => {
      const sanitize = isClient ? purifyClient : async (s: string) => stripHTML(s);

      const question = await sanitize(raw.question);
      const answer = await sanitize(raw.answer);
      const distractors = await Promise.all(
        raw.distractors.map((d) => sanitize(d))
      );

      // Warn if sanitization changed content
      if (question !== raw.question.trim())
        warnings.push(`Item ${idx + 1}: HTML stripped from question`);
      if (answer !== raw.answer.trim())
        warnings.push(`Item ${idx + 1}: HTML stripped from answer`);

      distractors.forEach((d, i) => {
        if (d !== raw.distractors[i].trim())
          warnings.push(`Item ${idx + 1}: HTML stripped from distractor ${i + 1}`);
      });

      // Validate answer is not among distractors
      const lowerAnswer = answer.toLowerCase();
      const hasConflict = distractors.some(
        (d) => d.toLowerCase() === lowerAnswer
      );
      if (hasConflict) {
        warnings.push(
          `Item ${idx + 1}: Answer matches a distractor — duplicates may appear in MC mode`
        );
      }

      return {
        id: randomUUID(),
        question,
        answer,
        distractors: distractors as [string, string, string],
      };
    })
  );

  return { items, warnings };
}
