export function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array<number>(cols));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function checkAnswer(
  userInput: string | string[],
  acceptedAnswers: string[]
): boolean {
  if (Array.isArray(userInput)) {
    const normalizedInput = userInput.map(normalizeAnswer).sort();
    const normalizedAccepted = acceptedAnswers.map(normalizeAnswer).sort();

    if (normalizedInput.length !== normalizedAccepted.length) return false;

    return normalizedAccepted.every((accepted, idx) =>
      isFuzzyMatch(normalizedInput[idx], accepted)
    );
  }

  const normalizedInput = normalizeAnswer(userInput);
  return acceptedAnswers.some((answer) =>
    isFuzzyMatch(normalizedInput, normalizeAnswer(answer))
  );
}

function isFuzzyMatch(input: string, answer: string): boolean {
  if (!input || !answer) return false;
  if (input === answer) return true;

  const threshold = Math.min(2, Math.max(1, Math.floor(answer.length * 0.1)));
  return levenshteinDistance(input, answer) <= threshold;
}
