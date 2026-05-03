/**
 * Sanitization module — strips HTML/script from all string fields.
 * Uses regex-based stripping (works on both server and client without
 * dynamic imports that can cause webpack chunk errors).
 */
 
import type { ValidatedQuizImport } from "@/lib/schemas/quiz";
import type { QuizItem } from "@/types/quiz";
crypto.randomUUID()
 
// ─── HTML stripper (server + client safe) ────────────────────────────────────
 
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
 
// ─── Main sanitization function ───────────────────────────────────────────────
 
export async function sanitizeQuizItems(
  validated: ValidatedQuizImport
): Promise<{ items: QuizItem[]; warnings: string[] }> {
  const warnings: string[] = [];
 
  const items: QuizItem[] = await Promise.all(
    validated.map(async (raw, idx) => {
      const question = stripHTML(raw.question);
      const answer = stripHTML(raw.answer);
      const distractors = raw.distractors.map((d) => stripHTML(d));
 
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
        id: crypto.randomUUID(),
        question,
        answer,
        distractors: distractors as [string, string, string],
      };
    })
  );
 
  return { items, warnings };
}