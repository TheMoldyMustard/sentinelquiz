/**
 * Sanitization module - strips HTML/script from all string fields.
 */

import type { ValidatedQuizImport } from "@/lib/schemas/quiz";
import type { QuizItem } from "@/types/quiz";

function stripHTML(input: string): string {
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

export async function sanitizeQuizItems(
  validated: ValidatedQuizImport
): Promise<{ items: QuizItem[]; warnings: string[] }> {
  const warnings: string[] = [];

  const items = validated.map((raw, idx): QuizItem => {
    const prompt = stripHTML(raw.prompt);
    const accepted_answers = raw.accepted_answers.map(stripHTML);
    const options = raw.options.map(stripHTML);

    if (prompt !== raw.prompt.trim()) {
      warnings.push(`Item ${idx + 1}: HTML stripped from prompt`);
    }

    raw.accepted_answers.forEach((answer, answerIdx) => {
      if (accepted_answers[answerIdx] !== answer.trim()) {
        warnings.push(`Item ${idx + 1}: HTML stripped from accepted answer ${answerIdx + 1}`);
      }
    });

    raw.options.forEach((option, optionIdx) => {
      if (options[optionIdx] !== option.trim()) {
        warnings.push(`Item ${idx + 1}: HTML stripped from option ${optionIdx + 1}`);
      }
    });

    const normalizedAnswers = new Set(
      accepted_answers.map((answer) => answer.toLowerCase())
    );
    const matchingOptions = options.filter((option) =>
      normalizedAnswers.has(option.toLowerCase())
    );

    if (raw.type !== "multiple_select" && matchingOptions.length !== 1) {
      warnings.push(
        `Item ${idx + 1}: exactly one option should match the accepted answer`
      );
    }

    if (raw.type === "multiple_select" && matchingOptions.length < 2) {
      warnings.push(
        `Item ${idx + 1}: multiple-select options should include at least two accepted answers`
      );
    }

    return {
      id: crypto.randomUUID(),
      type: raw.type,
      prompt,
      accepted_answers,
      options,
    };
  });

  return { items, warnings };
}
