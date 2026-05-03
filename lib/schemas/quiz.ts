import { z } from "zod";

// ─── Raw Item Schema (validates imported JSON) ────────────────────────────────

const QuizItemRawSchema = z.object({
  question: z
    .string({ required_error: "question is required" })
    .min(3, "question must be at least 3 characters")
    .max(1000, "question must be under 1000 characters")
    .trim(),

  answer: z
    .string({ required_error: "answer is required" })
    .min(1, "answer must be at least 1 character")
    .max(500, "answer must be under 500 characters")
    .trim(),

  distractors: z
    .array(
      z
        .string()
        .min(1, "distractor cannot be empty")
        .max(500, "distractor must be under 500 characters")
        .trim()
    )
    .length(3, "distractors must contain exactly 3 items"),
});

export const QuizImportSchema = z
  .array(QuizItemRawSchema, {
    required_error: "Expected an array of quiz items",
    invalid_type_error: "Root element must be an array",
  })
  .min(1, "Quiz must contain at least 1 item")
  .max(500, "Quiz cannot exceed 500 items");

export type ValidatedQuizImport = z.infer<typeof QuizImportSchema>;

// ─── Validation Helper ────────────────────────────────────────────────────────

export interface SchemaValidationResult {
  success: boolean;
  data?: ValidatedQuizImport;
  error?: string;
  details?: string[];
}

export function validateQuizJSON(raw: unknown): SchemaValidationResult {
  const result = QuizImportSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues;
  const details = issues.map((issue) => {
    const path = issue.path.length > 0 ? `[${issue.path.join(".")}] ` : "";
    return `${path}${issue.message}`;
  });

  return {
    success: false,
    error: `Validation failed: ${issues.length} error(s) found`,
    details,
  };
}
