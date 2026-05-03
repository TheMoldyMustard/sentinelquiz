import { z } from "zod";

const AnswerString = z
  .string()
  .min(1, "answer cannot be empty")
  .max(500, "answer must be under 500 characters")
  .trim();

const PromptString = z
  .string({ required_error: "prompt is required" })
  .min(3, "prompt must be at least 3 characters")
  .max(1000, "prompt must be under 1000 characters")
  .trim();

export const QuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("identification"),
    prompt: PromptString,
    accepted_answers: z.array(AnswerString).min(1),
    options: z.array(AnswerString).length(4),
  }),
  z.object({
    type: z.literal("multiple_choice"),
    prompt: PromptString,
    accepted_answers: z.array(AnswerString).length(1),
    options: z.array(AnswerString).length(4),
  }),
  z.object({
    type: z.literal("multiple_select"),
    prompt: PromptString,
    accepted_answers: z.array(AnswerString).min(2),
    options: z.array(AnswerString).min(4),
  }),
]);

const LegacyQuizItemSchema = z
  .object({
    question: z
      .string({ required_error: "question is required" })
      .min(3, "question must be at least 3 characters")
      .max(1000, "question must be under 1000 characters")
      .trim(),
    answer: AnswerString,
    distractors: z
      .array(AnswerString)
      .length(3, "distractors must contain exactly 3 items"),
  })
  .transform((raw) => ({
    type: "identification" as const,
    prompt: raw.question,
    accepted_answers: [raw.answer],
    options: [raw.answer, ...raw.distractors],
  }));

const QuizItemImportSchema = z.union([QuestionSchema, LegacyQuizItemSchema]);

export const QuizImportSchema = z
  .array(QuizItemImportSchema, {
    required_error: "Expected an array of quiz items",
    invalid_type_error: "Root element must be an array",
  })
  .min(1, "Quiz must contain at least 1 item")
  .max(500, "Quiz cannot exceed 500 items");

export type ValidatedQuizImport = z.infer<typeof QuizImportSchema>;
export type ValidatedQuestion = z.infer<typeof QuestionSchema>;

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
