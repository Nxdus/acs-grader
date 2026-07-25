import { DEFAULT_CONTEST_PROBLEM_MAX_SCORE, FIXED_TEST_CASE_COUNT } from "@/lib/problem-config";

export const computeScore = (
  passedTestCaseCount: number,
  maxScore: number | null | undefined = DEFAULT_CONTEST_PROBLEM_MAX_SCORE,
) => {
  if (!Number.isFinite(passedTestCaseCount)) return 0;

  const normalizedMaxScore =
    typeof maxScore === "number" && Number.isFinite(maxScore)
      ? Math.max(0, Math.trunc(maxScore))
      : DEFAULT_CONTEST_PROBLEM_MAX_SCORE;
  const normalizedPassedCount = Math.min(
    FIXED_TEST_CASE_COUNT,
    Math.max(0, Math.trunc(passedTestCaseCount)),
  );

  return Math.floor((normalizedPassedCount * normalizedMaxScore) / FIXED_TEST_CASE_COUNT);
};
